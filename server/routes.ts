import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as admin from "firebase-admin";
import * as firebaseAdmin from "firebase-admin";
import { createHash, timingSafeEqual } from "crypto";
import multer from "multer";
import path from "path";
import fetch from "node-fetch";
import { 
  User, Activity, InsertActivity, ActivityParticipant,
  insertSearchHistorySchema, insertSearchPreferencesSchema 
} from "@shared/schema";
import { storage } from "./storage";
import { log as serverLog } from "./vite";
import { upload, getFileUrl, generateThumbnail } from "./upload";
// import { openaiRouter } from "./openai";

// Initialize Firebase Admin SDK
try {
  if (firebaseAdmin.apps && firebaseAdmin.apps.length === 0) {
    firebaseAdmin.initializeApp({
      projectId: "comemingel"
    });
    console.log("Firebase Admin initialized successfully");
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

export enum ApiErrorCode {
  VALIDATION_ERROR = "validation_error",
  NOT_FOUND = "not_found",
  CONFLICT = "conflict",
  INTERNAL_SERVER_ERROR = "internal_server_error",
  UNAUTHORIZED = "unauthorized",
  FORBIDDEN = "forbidden"
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve public files from uploads directory
  app.get("/uploads/:fileId", (req, res, next) => {
    const filepath = path.join(__dirname, "../uploads", req.params.fileId);
    if (path.extname(filepath)) {
      return res.sendFile(filepath);
    }
    next();
  });
  
  // Authentication middleware with extended Request type
  interface AuthenticatedRequest extends Request {
    user: {
      uid: string;
      email?: string;
      name?: string;
      picture?: string;
      [key: string]: any; // For andre Firebase auth egenskaper
    };
  }

  // Type for Express handler that expects an authenticated request
  type AuthenticatedHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<any> | any;

  // Helper to send standardized error responses
  function sendErrorResponse(
    res: Response, 
    message: string, 
    statusCode: string, 
    errorCode: ApiErrorCode,
    details?: any
  ) {
    const response = {
      success: false,
      error: {
        message,
        code: errorCode,
        details
      }
    };
    res.status(parseInt(statusCode)).json(response);
  }

  function withAuth(handler: AuthenticatedHandler): RequestHandler {
    return function(req: Request, res: Response, next: NextFunction) {
      const authenticatedReq = req as AuthenticatedRequest;
      return handler(authenticatedReq, res, next);
    };
  }

  // Middleware to handle authentication
  const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    // For development mode, we'll create a mock user session
    if (process.env.NODE_ENV === 'development' || req.headers['x-dev-mode'] === 'true') {
      (req as AuthenticatedRequest).user = {
        uid: 'dev-user-id',
        email: 'dev@example.com',
        name: 'Development User'
      };
      return next();
    }

    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
      return sendErrorResponse(
        res,
        "No authentication token provided",
        "401",
        ApiErrorCode.UNAUTHORIZED
      );
    }
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      (req as AuthenticatedRequest).user = decodedToken;
      next();
    } catch (error) {
      console.error("Error verifying Firebase ID token:", error);
      return sendErrorResponse(
        res,
        "Invalid authentication token",
        "401",
        ApiErrorCode.UNAUTHORIZED
      );
    }
  };

  // Helper to handle database errors with automatic retries
  async function handleApiDatabaseError<T>(
    res: Response,
    error: any,
    retryOperation?: () => Promise<T>
  ): Promise<Response | void> {
    console.error("Database operation error:", error);
    
    // If we have a retry operation and the error seems recoverable, try again
    if (retryOperation && error.code === 'SQLITE_BUSY') {
      try {
        console.log("Retrying database operation...");
        const result = await retryOperation();
        res.json(result);
        return;
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    }
    
    // Send appropriate error response based on the error type
    if (error.code === 'SQLITE_CONSTRAINT') {
      return sendErrorResponse(
        res,
        "Database constraint violation. The operation cannot be completed.",
        "409",
        ApiErrorCode.CONFLICT
      );
    } else {
      return sendErrorResponse(
        res,
        "A database error occurred. Please try again later.",
        "500",
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        { message: error.message }
      );
    }
  }

  // Define a function for logging with consistent format
  function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    serverLog(message, 'routes');
  }

  // Mount the OpenAI router - commented out for now
  // app.use('/api/openai', openaiRouter);
  
  // API endpoint for activity recommendations
  app.get('/api/recommendations', authenticateUser, withAuth(async (req, res) => {
    try {
      const recommendations = await storage.getActivityRecommendationsForUser(req.user.uid);
      return res.json({ recommendations });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));
  
  // API endpoint for generating new recommendations
  app.post('/api/recommendations/generate', authenticateUser, withAuth(async (req, res) => {
    try {
      const recommendations = await storage.generateRecommendationsForUser(req.user.uid);
      return res.json({ recommendations });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));
  
  // API endpoint for updating recommendation status
  app.patch('/api/recommendations/:id/status', authenticateUser, withAuth(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'accepted', 'rejected', 'saved'].includes(status)) {
        return sendErrorResponse(
          res,
          "Invalid status value",
          "400",
          ApiErrorCode.VALIDATION_ERROR,
          { accepted_values: ['pending', 'accepted', 'rejected', 'saved'] }
        );
      }
      
      const updatedRecommendation = await storage.updateActivityRecommendationStatus(id, status);
      return res.json({ recommendation: updatedRecommendation });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));
  
  // Search history endpoints
  app.get('/api/search/history', authenticateUser, withAuth(async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const history = await storage.getUserSearchHistory(req.user.uid, limit);
      return res.json({ history });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));

  app.post('/api/search/save', authenticateUser, withAuth(async (req, res) => {
    try {
      const searchData = req.body;
      
      // Make sure user ID is set correctly
      const searchDataWithUser = {
        ...searchData,
        userId: req.user.uid
      };
      
      try {
        insertSearchHistorySchema.parse(searchDataWithUser);
      } catch (validationError) {
        log(`Invalid search data: ${JSON.stringify(validationError)}`, 'error');
        return sendErrorResponse(
          res,
          "Invalid search data",
          "400",
          ApiErrorCode.VALIDATION_ERROR,
          validationError
        );
      }
      
      // Check if user exists in database first
      const user = await storage.getUserByFirebaseId(req.user.uid);
      if (!user) {
        log(`User ${req.user.uid} not found in database when saving search history. Attempting to create dev user.`, 'warn');
        
        // In development mode, try to create a dev user if it doesn't exist
        if (req.user.uid === 'dev-user-id') {
          try {
            // Create a dev user if it doesn't exist
            await storage.createUser({
              firebaseId: 'dev-user-id',
              username: 'dev_user',
              email: 'dev@example.com',
              displayName: 'Dev User'
              // Schema doesn't include password field
            });
            log('Created dev user for search history', 'info');
          } catch (error: any) {
            // Ignore duplicate key errors (user might have been created by another request)
            if (error.code !== 'UNIQUE_CONSTRAINT') {
              log(`Failed to create dev user: ${error.message}`, 'error');
              return sendErrorResponse(
                res,
                "Cannot save search history: failed to create user",
                "500",
                ApiErrorCode.INTERNAL_SERVER_ERROR
              );
            }
          }
        } else {
          return sendErrorResponse(
            res,
            "User not found",
            "404",
            ApiErrorCode.NOT_FOUND
          );
        }
      }
      
      const searchHistory = await storage.saveSearchHistory(searchDataWithUser);
      return res.status(201).json({ searchHistory });
    } catch (error: any) {
      log(`Error saving search history: ${error.message}`, 'error');
      return handleApiDatabaseError(res, error);
    }
  }));

  app.get('/api/search/suggestions', authenticateUser, withAuth(async (req, res) => {
    try {
      const prefix = req.query.q as string || '';
      if (!prefix) {
        return res.json({ suggestions: [] });
      }
      
      const suggestions = await storage.getSearchSuggestions(req.user.uid, prefix);
      return res.json({ suggestions });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));
  
  // Get nearby search suggestions based on user location and popular searches
  app.get('/api/search/nearby', authenticateUser, withAuth(async (req, res) => {
    try {
      const userId = req.user.uid;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
      
      // These would normally come from database based on location
      // For now using hardcoded suggestions relevant to Norwegian users
      const suggestions = [
        "Plogging i Frognerparken",
        "Joggegruppe Majorstuen",
        "Kajakk ved Bygdøy",
        "Yoga i Slottsparken",
        "Fotballtrening Voldsløkka",
        "Fjelltur Holmenkollen"
      ].slice(0, limit);
      
      return res.json({ suggestions });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));
  
  // Get personalized search suggestions based on user history and behavior
  app.get('/api/search/personalized', authenticateUser, withAuth(async (req, res) => {
    try {
      const userId = req.user.uid;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Step 1: Get user's search history
      const userHistory = await storage.getUserSearchHistory(userId, 50);
      
      // Step 2: Get user's activity preferences if available
      let userPreferences;
      try {
        userPreferences = await storage.getUserActivityPreferences(userId);
      } catch (e) {
        console.log("Activity preferences not found for user");
      }
      
      // Step 3: Generate personalized suggestions
      
      // Extract frequent search terms from user history
      const searchTerms = userHistory.map(item => item.query);
      const searchTypes = userHistory
        .filter(item => item.type)
        .map(item => item.type);
      
      // Count frequency of searches
      const termFrequency: Record<string, number> = {};
      searchTerms.forEach(term => {
        termFrequency[term] = (termFrequency[term] || 0) + 1;
      });
      
      // Count frequency of search types
      const typeFrequency: Record<string, number> = {};
      searchTypes.forEach(type => {
        if (type) {
          typeFrequency[type] = (typeFrequency[type] || 0) + 1;
        }
      });
      
      // Filter favorite searches
      const favorites = userHistory
        .filter(item => item.favorite)
        .map(item => item.query);
      
      // Generate time-based suggestions
      const hour = new Date().getHours();
      const timeBasedSuggestions: string[] = [];
      
      // Morning suggestions
      if (hour >= 6 && hour < 11) {
        timeBasedSuggestions.push('Morgentrening', 'Frokost-treff', 'Joggetur');
      }
      // Lunch suggestions
      else if (hour >= 11 && hour < 14) {
        timeBasedSuggestions.push('Lunsj-treff', 'Shopping-tur', 'Kaffepauser');
      }
      // Afternoon suggestions
      else if (hour >= 14 && hour < 18) {
        timeBasedSuggestions.push('Ettermiddagstur', 'Studiegruppe', 'Fotball');
      }
      // Evening suggestions
      else {
        timeBasedSuggestions.push('Middag ute', 'Kveldstrening', 'Filmkveld');
      }
      
      // Include preferences-based suggestions if available
      const preferencesBasedSuggestions: string[] = [];
      if (userPreferences) {
        const preferredCategories = userPreferences.preferredCategories || [];
        const preferredTimeOfDay = userPreferences.preferredTimeOfDay || [];
        
        // Map activity types to suggestions based on preferred categories
        if (preferredCategories.includes('outdoor')) {
          preferencesBasedSuggestions.push('Friluftsliv', 'Fjelltur', 'Sykling');
        }
        if (preferredCategories.includes('sports')) {
          preferencesBasedSuggestions.push('Fotball', 'Basketball', 'Tennis');
        }
        if (preferredCategories.includes('cultural')) {
          preferencesBasedSuggestions.push('Museum', 'Konserter', 'Kunstutstilling');
        }
        if (preferredCategories.includes('social')) {
          preferencesBasedSuggestions.push('Kaffetreff', 'Middag ute', 'Filmkveld');
        }
      }
      
      // Trending or popular searches (could be from global stats in a real implementation)
      const trendingSuggestions = [
        'Plogging', 
        'Kajakktur',
        'Fotballkamp',
        'Løpetrening',
        'Yogaklasse',
        'Sykkeltur'
      ];
      
      // Combine all suggestions, prioritizing favorites and frequent searches
      let personalizedSuggestions = [
        ...favorites,
        ...Object.keys(termFrequency)
          .sort((a, b) => termFrequency[b] - termFrequency[a])
          .slice(0, 5),
        ...preferencesBasedSuggestions,
        ...timeBasedSuggestions,
        ...trendingSuggestions
      ];
      
      // Remove duplicates
      personalizedSuggestions = Array.from(new Set(personalizedSuggestions));
      
      // Return limited results
      return res.json({ 
        suggestions: personalizedSuggestions.slice(0, limit),
        trending: trendingSuggestions.slice(0, 3),
        categories: {
          favorites: favorites.slice(0, 3),
          timeBased: timeBasedSuggestions.slice(0, 3),
          trending: trendingSuggestions.slice(0, 3),
          preferences: preferencesBasedSuggestions.slice(0, 3)
        }
      });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));

  app.get('/api/search/preferences', authenticateUser, withAuth(async (req, res) => {
    try {
      const preferences = await storage.getUserSearchPreferences(req.user.uid);
      return res.json({ preferences: preferences || {} });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));

  app.post('/api/search/preferences', authenticateUser, withAuth(async (req, res) => {
    try {
      const userPreferences = req.body;
      
      // Check if user already has preferences
      const existingPreferences = await storage.getUserSearchPreferences(req.user.uid);
      
      let preferences;
      if (existingPreferences) {
        // Update existing preferences
        preferences = await storage.updateSearchPreferences(req.user.uid, userPreferences);
      } else {
        // Create new preferences
        try {
          insertSearchPreferencesSchema.parse({
            ...userPreferences,
            userId: req.user.uid
          });
        } catch (validationError) {
          log(`Invalid search preferences: ${JSON.stringify(validationError)}`, 'error');
          return sendErrorResponse(
            res,
            "Invalid search preferences data",
            "400",
            ApiErrorCode.VALIDATION_ERROR,
            validationError
          );
        }
        
        preferences = await storage.createSearchPreferences({
          ...userPreferences,
          userId: req.user.uid
        });
      }
      
      return res.json({ preferences });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));

  // Near-me search endpoint
  app.get('/api/search/near-me', authenticateUser, withAuth(async (req, res) => {
    try {
      const latitude = req.query.lat ? parseFloat(req.query.lat as string) : null;
      const longitude = req.query.lng ? parseFloat(req.query.lng as string) : null;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : 5;
      
      if (!latitude || !longitude) {
        return sendErrorResponse(
          res,
          "Missing location coordinates",
          "400", 
          ApiErrorCode.VALIDATION_ERROR
        );
      }
      
      // Check if user exists in database
      const user = await storage.getUserByFirebaseId(req.user.uid);
      if (!user) {
        log(`User ${req.user.uid} not found in database when performing near-me search`, 'warn');
        
        // Don't try to save preferences or history if user doesn't exist
        // Just return results
        return res.json({ 
          results: [],
          location: { latitude, longitude },
          radius
        });
      }
      
      // Update user's last location in search preferences
      const userPrefs = await storage.getUserSearchPreferences(req.user.uid);
      if (userPrefs) {
        await storage.updateSearchPreferences(req.user.uid, {
          lastLocation: { latitude, longitude }
        });
      }
      
      // Save search to history
      await storage.saveSearchHistory({
        userId: req.user.uid,
        query: "nearby",
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        type: "map_search",
        successful: true
      });
      
      // For now returning eksempeldata - i en fremtidig implementasjon
      // ville dette faktisk søke etter brukere eller aktiviteter i nærheten
      const mockResults = [
        {
          name: "Plogging i Frognerparken",
          type: "Aktivitet",
          description: "Bli med på miljøvennlig jogging mens vi plukker søppel i Frognerparken",
          distance: "1.2 km"
        },
        {
          name: "Kajakkpadling ved Bygdøy",
          type: "Vannsport",
          description: "Rolig kajakktur langs Bygdøy med fokus på naturopplevelser og fotografering",
          distance: "1.8 km"
        },
        {
          name: "Yoga i Slottsparken",
          type: "Trening",
          description: "Utendørs yoga for alle nivåer. Ta med egen matte!",
          distance: "0.5 km"
        }
      ];
      
      return res.json({ 
        results: mockResults,
        location: { latitude, longitude },
        radius
      });
    } catch (error: any) {
      log(`Error performing near-me search: ${error.message}`, 'error');
      return handleApiDatabaseError(res, error);
    }
  }));
  
  app.patch('/api/search/history/:id', authenticateUser, withAuth(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Ensure user can only update their own search history
      const historyItem = await storage.getSearchHistoryItem(id);
      if (!historyItem) {
        return sendErrorResponse(
          res, 
          "Search history item not found", 
          "404", 
          ApiErrorCode.NOT_FOUND
        );
      }
      
      if (historyItem.userId !== req.user.uid) {
        return sendErrorResponse(
          res,
          "You don't have permission to update this search history item",
          "403",
          ApiErrorCode.FORBIDDEN
        );
      }
      
      const updatedHistory = await storage.updateSearchHistoryItem(id, updateData);
      return res.json({ history: updatedHistory });
    } catch (error) {
      return handleApiDatabaseError(res, error);
    }
  }));
  
  const httpServer = createServer(app);
  
  // Initialize WebSocket server on the same HTTP server but on a different path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  return httpServer;
}
