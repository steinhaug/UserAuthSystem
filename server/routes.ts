import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import admin from "firebase-admin";
import { DatabaseError } from "./utils/errorHandler";
import { 
  sendErrorResponse, 
  handleApiDatabaseError, 
  ApiErrorCode,
  validateRequest
} from "./utils/apiErrorHandler";
import { log } from "./vite";
import { WebSocketServer, WebSocket } from 'ws';
import openaiRouter from './openai';

// Initialize Firebase Admin
try {
  // Check if Firebase Admin has already been initialized
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      projectId: "comemingel"
    });
    console.log("Firebase Admin initialized successfully");
  }
} catch (error) {
  console.error("Firebase admin initialization error:", error);
}

export async function registerRoutes(app: Express): Promise<Server> {
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
  
  const authenticateUser = async (
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return sendErrorResponse(
          res, 
          "Authentication required to access this resource", 
          401, 
          ApiErrorCode.UNAUTHORIZED
        );
      }

      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Authentication error:", error);
      return sendErrorResponse(
        res, 
        "Invalid or expired authentication token", 
        401, 
        ApiErrorCode.UNAUTHORIZED
      );
    }
  };

  // User endpoints
  app.get("/api/users/profile", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      
      try {
        const user = await storage.getUserByFirebaseId(userId);
        if (!user) {
          return sendErrorResponse(
            res,
            "User profile not found",
            404,
            ApiErrorCode.NOT_FOUND
          );
        }
        res.json(user);
      } catch (error) {
        // Pass the retry operation to the error handler for possible recovery
        await handleApiDatabaseError(res, error, async () => {
          // This is the retry operation that will be executed if recovery is possible
          return await storage.getUserByFirebaseId(userId);
        });
      }
    } catch (outerError: any) {
      log(`Unexpected error in user profile retrieval: ${outerError?.message || 'Unknown error'}`, 'error');
      sendErrorResponse(
        res,
        "An unexpected error occurred while retrieving your profile",
        500,
        ApiErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  });

  app.post("/api/users/profile", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { displayName, status, interests } = req.body;
      const updatedUser = await storage.updateUser(req.user.uid, {
        displayName,
        status,
        interests,
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Location update endpoint
  app.post("/api/users/location", authenticateUser, async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      await storage.updateUserLocation(req.user.uid, { latitude, longitude });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user location:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Friends endpoints
  app.get("/api/friends", authenticateUser, async (req, res) => {
    try {
      const friends = await storage.getFriendsByUserId(req.user.uid);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/friends/request", authenticateUser, async (req, res) => {
    try {
      const { friendId } = req.body;
      const friendRequest = await storage.createFriendRequest(req.user.uid, friendId);
      res.json(friendRequest);
    } catch (error) {
      console.error("Error creating friend request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/friends/request/:requestId", authenticateUser, async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      const updatedRequest = await storage.updateFriendRequest(requestId, status);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating friend request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Activities endpoints
  app.get("/api/activities", authenticateUser, async (req, res) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/activities", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate required fields
      const { title, description, location, startTime, endTime, maxParticipants, category } = req.body;
      
      if (!title || !location || !startTime || !endTime) {
        return sendErrorResponse(
          res,
          "Missing required fields for activity creation",
          400,
          ApiErrorCode.VALIDATION_ERROR,
          { requiredFields: ['title', 'location', 'startTime', 'endTime'] }
        );
      }
      
      const activityData = {
        ...req.body,
        creatorId: req.user.uid,
      };
      
      try {
        const activity = await storage.createActivity(activityData);
        res.status(201).json(activity);
      } catch (error) {
        // Pass the retry operation to the error handler for possible recovery
        await handleApiDatabaseError(res, error, async () => {
          // This is the retry operation that will be executed if recovery is possible
          return await storage.createActivity(activityData);
        });
      }
    } catch (outerError: any) {
      log(`Unexpected error in activity creation: ${outerError?.message || 'Unknown error'}`, 'error');
      sendErrorResponse(
        res,
        "An unexpected error occurred while processing your request",
        500,
        ApiErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  });
  
  app.get("/api/activities/:id", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const activity = await storage.getActivityById(id);
      
      if (!activity) {
        return sendErrorResponse(
          res,
          `Activity with ID ${id} not found`,
          404,
          ApiErrorCode.NOT_FOUND
        );
      }
      
      res.json({ activity });
    } catch (error) {
      await handleApiDatabaseError(res, error);
    }
  });

  app.post("/api/activities/:activityId/join", authenticateUser, async (req, res) => {
    try {
      const { activityId } = req.params;
      const participant = await storage.joinActivity(activityId, req.user.uid);
      res.json(participant);
    } catch (error) {
      console.error("Error joining activity:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Challenges endpoints
  app.get("/api/challenges", authenticateUser, async (req, res) => {
    try {
      const challenges = await storage.getChallenges();
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/challenges/user", authenticateUser, async (req, res) => {
    try {
      const userChallenges = await storage.getUserChallenges(req.user.uid);
      res.json(userChallenges);
    } catch (error) {
      console.error("Error fetching user challenges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/challenges/:challengeId/accept", authenticateUser, async (req, res) => {
    try {
      const { challengeId } = req.params;
      const userChallenge = await storage.acceptChallenge(challengeId, req.user.uid);
      res.json(userChallenge);
    } catch (error) {
      console.error("Error accepting challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/challenges/:challengeId/progress", authenticateUser, async (req, res) => {
    try {
      const { challengeId } = req.params;
      const { progress } = req.body;
      const updatedChallenge = await storage.updateChallengeProgress(challengeId, req.user.uid, progress);
      res.json(updatedChallenge);
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search History endpoints
  app.post("/api/search/history", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, latitude, longitude, resultCount, category, successful } = req.body;
      
      const searchData = {
        userId: req.user.uid,
        query,
        latitude,
        longitude,
        resultCount,
        category,
        successful: successful !== false // Default to true if not explicitly set to false
      };
      
      const history = await storage.saveSearchHistory(searchData);
      res.status(201).json(history);
    } catch (error) {
      console.error("Error saving search history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/search/history", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const history = await storage.getUserSearchHistory(req.user.uid, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update search history item with tags, notes, or favorite status
  app.patch("/api/search/history/:id", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid search history ID" });
      }
      
      // Only allow certain fields to be updated
      const allowedFields = ['tags', 'notes', 'favorite'];
      const updates: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      // Verify that the search history item belongs to the user
      const item = await storage.getSearchHistoryItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Search history item not found" });
      }
      
      if (item.userId !== req.user.uid) {
        return res.status(403).json({ message: "You can only update your own search history" });
      }
      
      const updated = await storage.updateSearchHistoryItem(itemId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating search history item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/search/suggestions", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prefix = req.query.prefix as string || '';
      const suggestions = await storage.getSearchSuggestions(req.user.uid, prefix);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching search suggestions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search Preferences endpoints
  app.get("/api/search/preferences", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const preferences = await storage.getUserSearchPreferences(req.user.uid);
      if (!preferences) {
        // Create default preferences if none exist
        const defaultPrefs = {
          userId: req.user.uid,
          favoriteCategories: [],
          favoriteLocations: [],
          radius: 5
        };
        const newPrefs = await storage.createSearchPreferences(defaultPrefs);
        res.json(newPrefs);
      } else {
        res.json(preferences);
      }
    } catch (error) {
      console.error("Error fetching search preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/search/preferences", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { favoriteCategories, favoriteLocations, lastLocation, radius } = req.body;
      
      // Get existing preferences or create if they don't exist
      let preferences = await storage.getUserSearchPreferences(req.user.uid);
      if (!preferences) {
        const newPrefs = {
          userId: req.user.uid,
          favoriteCategories: favoriteCategories || [],
          favoriteLocations: favoriteLocations || [],
          lastLocation,
          radius: radius || 5
        };
        preferences = await storage.createSearchPreferences(newPrefs);
      } else {
        // Update existing preferences
        preferences = await storage.updateSearchPreferences(req.user.uid, {
          favoriteCategories, 
          favoriteLocations, 
          lastLocation, 
          radius
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error updating search preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Near Me Now endpoint for personalized nearby suggestions
  app.get("/api/search/near-me", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { latitude, longitude, radius = 1 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      // Try to get user preferences to personalize the suggestions
      const preferences = await storage.getUserSearchPreferences(req.user.uid);
      
      // Get user's search history to determine interests
      const searchHistory = await storage.getUserSearchHistory(req.user.uid, 20);
      
      // Call the OpenAI API for personalized suggestions
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/openai/location-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
          radius: parseFloat(radius as string),
          preferences: preferences || { favoriteCategories: [], favoriteLocations: [] },
          history: searchHistory || []
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get location suggestions: ${response.statusText}`);
      }
      
      const suggestions = await response.json();
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting nearby suggestions:", error);
      res.status(500).json({ 
        message: "Failed to get nearby suggestions",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Mount the OpenAI router - we don't require authentication for these endpoints
  // to allow for guest voice search functionality
  app.use('/api/openai', openaiRouter);

  // Activity Recommendations API endpoints
  app.get("/api/recommendations", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const recommendations = await storage.getActivityRecommendationsForUser(userId);
      
      if (recommendations.length === 0) {
        // Generate new recommendations if none exist
        const newRecommendations = await storage.generateRecommendationsForUser(userId);
        return res.json({ recommendations: newRecommendations });
      }
      
      return res.json({ recommendations });
    } catch (error) {
      await handleApiDatabaseError(res, error);
    }
  });

  app.post("/api/recommendations/generate", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const recommendations = await storage.generateRecommendationsForUser(userId);
      return res.json({ recommendations });
    } catch (error) {
      await handleApiDatabaseError(res, error);
    }
  });

  app.patch("/api/recommendations/:id/status", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'accepted', 'rejected', 'saved'].includes(status)) {
        return sendErrorResponse(
          res,
          "Invalid status. Must be one of: pending, accepted, rejected, saved",
          400,
          ApiErrorCode.VALIDATION_ERROR
        );
      }
      
      const updatedRecommendation = await storage.updateActivityRecommendationStatus(
        parseInt(id), 
        status
      );
      
      if (!updatedRecommendation) {
        return sendErrorResponse(
          res,
          `Recommendation with ID ${id} not found`,
          404,
          ApiErrorCode.NOT_FOUND
        );
      }
      
      return res.json({ recommendation: updatedRecommendation });
    } catch (error) {
      await handleApiDatabaseError(res, error);
    }
  });

  // Reputation System API endpoints
  
  // Get user's reputation profile
  app.get("/api/reputation/profile", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const reputationProfile = await storage.getUserReputation(userId);
      
      if (!reputationProfile) {
        // If no profile exists yet, return a placeholder with default values
        return res.json({
          userId,
          overallScore: 50,
          reliabilityScore: 50,
          safetyScore: 50,
          communityScore: 50,
          activityCount: 0,
          verificationLevel: 0,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return res.json(reputationProfile);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Create or update user's reputation profile
  app.post("/api/reputation/profile", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const reputationData = req.body;
      
      // Validate input
      if (!reputationData) {
        return sendErrorResponse(
          res,
          400,
          ApiErrorCode.BAD_REQUEST,
          "Missing reputation data"
        );
      }
      
      // Check if profile already exists
      const existingProfile = await storage.getUserReputation(userId);
      
      let reputationProfile;
      
      if (existingProfile) {
        // Update existing profile
        reputationProfile = await storage.updateUserReputation(userId, reputationData);
      } else {
        // Create new profile
        reputationProfile = await storage.createUserReputation({
          userId,
          overallScore: reputationData.overallScore || 50,
          reliabilityScore: reputationData.reliabilityScore || 50,
          safetyScore: reputationData.safetyScore || 50,
          communityScore: reputationData.communityScore || 50,
          activityCount: reputationData.activityCount || 0,
          verificationLevel: reputationData.verificationLevel || 0,
          isVerified: reputationData.isVerified || false
        });
      }
      
      return res.json(reputationProfile);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Get user's reputation events
  app.get("/api/reputation/events", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const events = await storage.getReputationEvents(userId, limit);
      return res.json(events);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Create a new reputation event
  app.post("/api/reputation/events", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventTypeId, referenceId, referenceType, value, details } = req.body;
      const userId = req.user.uid;
      
      // Validate input
      if (!eventTypeId || !referenceType) {
        return sendErrorResponse(
          res,
          400,
          ApiErrorCode.BAD_REQUEST,
          "Missing required event data"
        );
      }
      
      const newEvent = await storage.createReputationEvent({
        userId,
        eventTypeId,
        referenceId: referenceId || `manual_${Date.now()}`,
        referenceType,
        value: value || 0,
        details: details || '{}'
      });
      
      return res.status(201).json(newEvent);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Get available reputation event types
  app.get("/api/reputation/event-types", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventTypes = await storage.getReputationEventTypes();
      return res.json(eventTypes);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // User ratings endpoints
  
  // Get ratings for a user
  app.get("/api/reputation/ratings", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const asReceiver = req.query.as_receiver !== 'false'; // Default to true
      
      const ratings = await storage.getUserRatings(userId, asReceiver);
      return res.json(ratings);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Create a new rating
  app.post("/api/reputation/ratings", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { receiverId, score, comment, context, referenceId, isAnonymous } = req.body;
      const giverId = req.user.uid;
      
      // Validate input
      if (!receiverId || score === undefined || !context) {
        return sendErrorResponse(
          res,
          400,
          ApiErrorCode.BAD_REQUEST,
          "Missing required rating data"
        );
      }
      
      // Prevent self-rating
      if (giverId === receiverId) {
        return sendErrorResponse(
          res,
          400,
          ApiErrorCode.BAD_REQUEST,
          "Cannot rate yourself"
        );
      }
      
      const newRating = await storage.createUserRating({
        giverId,
        receiverId,
        score,
        comment: comment || '',
        context,
        referenceId: referenceId || `manual_${Date.now()}`,
        isAnonymous: isAnonymous || false
      });
      
      return res.status(201).json(newRating);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Trust connection endpoints
  
  // Get trust connections for a user
  app.get("/api/reputation/trust", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const asTrusted = req.query.as_trusted === 'true'; // Default to false
      
      const connections = await storage.getTrustConnections(userId, asTrusted);
      return res.json(connections);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Create a new trust connection
  app.post("/api/reputation/trust", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { trustedId, level, notes } = req.body;
      const trusterId = req.user.uid;
      
      // Validate input
      if (!trustedId || level === undefined) {
        return sendErrorResponse(
          res,
          400,
          ApiErrorCode.BAD_REQUEST,
          "Missing required trust connection data"
        );
      }
      
      // Prevent self-trust
      if (trusterId === trustedId) {
        return sendErrorResponse(
          res,
          400,
          ApiErrorCode.BAD_REQUEST,
          "Cannot trust yourself"
        );
      }
      
      // Create the connection
      try {
        const newConnection = await storage.createTrustConnection({
          trusterId,
          trustedId,
          level,
          notes: notes || null
        });
        
        return res.status(201).json(newConnection);
      } catch (error) {
        // Check if error is about existing connection
        if (error instanceof Error && error.message.includes('already exists')) {
          return sendErrorResponse(
            res,
            409,
            ApiErrorCode.CONFLICT,
            "Trust connection already exists. Use PUT to update it."
          );
        }
        throw error;
      }
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });
  
  // Update an existing trust connection
  app.put("/api/reputation/trust/:trustedId", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { trustedId } = req.params;
      const { level, notes } = req.body;
      const trusterId = req.user.uid;
      
      // Validate input
      if (!trustedId || level === undefined) {
        return sendErrorResponse(
          res,
          400,
          ApiErrorCode.BAD_REQUEST,
          "Missing required trust connection data"
        );
      }
      
      // Update the connection
      const updatedConnection = await storage.updateTrustConnection(
        trusterId,
        trustedId,
        level,
        notes
      );
      
      if (!updatedConnection) {
        return sendErrorResponse(
          res,
          404,
          ApiErrorCode.NOT_FOUND,
          "Trust connection not found"
        );
      }
      
      return res.json(updatedConnection);
    } catch (error) {
      return handleApiDatabaseError(error, res);
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server on the same HTTP server but on a different path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Connected clients with their user IDs and additional data
  const clients = new Map<WebSocket, { 
    userId: string;
    lastActivity: number;
    authenticated: boolean;
    subscriptions: string[]; // Topics/channels the client is subscribed to
  }>();
  
  // Set up ping interval to keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // Check if the client is still active
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        // If inactive for 5 minutes, close the connection
        if (Date.now() - clientInfo.lastActivity > 5 * 60 * 1000) {
          console.log(`Closing inactive connection for user: ${clientInfo.userId}`);
          ws.terminate();
          return;
        }
        
        // Send ping
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    });
  }, 30000); // Check every 30 seconds
  
  // Handle WebSocket server shutdown
  httpServer.on('close', () => {
    clearInterval(pingInterval);
  });
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    // Add client to the clients Map with initial data
    clients.set(ws, { 
      userId: 'unknown',
      lastActivity: Date.now(),
      authenticated: false,
      subscriptions: []
    });
    
    // Handle pong messages to keep track of active connections
    ws.on('pong', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        clientInfo.lastActivity = Date.now();
        clients.set(ws, clientInfo);
      }
    });
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message type:', data.type);
        
        // Update last activity timestamp
        const clientInfo = clients.get(ws);
        if (clientInfo) {
          clientInfo.lastActivity = Date.now();
          clients.set(ws, clientInfo);
        }
        
        // Handle authentication message
        if (data.type === 'authenticate') {
          if (data.token) {
            try {
              // Verify the Firebase ID token
              const decodedToken = await admin.auth().verifyIdToken(data.token);
              const userId = decodedToken.uid;
              
              // Update client info with the authenticated user ID
              clients.set(ws, { 
                ...clientInfo!,
                userId,
                authenticated: true 
              });
              
              // Send authentication confirmation
              ws.send(JSON.stringify({ 
                type: 'authentication_result', 
                success: true,
                userId
              }));
              
              console.log(`Client authenticated: ${userId}`);
              
              // Send any pending messages for the user
              const pendingMessages = await storage.getPendingMessagesForUser(userId);
              if (pendingMessages && pendingMessages.length > 0) {
                ws.send(JSON.stringify({
                  type: 'pending_messages',
                  messages: pendingMessages
                }));
                
                // Mark messages as delivered
                await storage.markMessagesAsDelivered(userId, pendingMessages.map(m => m.id.toString()));
              }
            } catch (error) {
              console.error('Authentication error:', error);
              ws.send(JSON.stringify({ 
                type: 'authentication_result', 
                success: false, 
                error: 'Invalid token' 
              }));
            }
          }
        }
        
        // Handle channel subscription
        else if (data.type === 'subscribe') {
          if (!clientInfo || !clientInfo.authenticated) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'NOT_AUTHENTICATED',
              message: 'Authentication required'
            }));
            return;
          }
          
          if (data.channel) {
            // Add channel to subscriptions
            if (!clientInfo.subscriptions.includes(data.channel)) {
              clientInfo.subscriptions.push(data.channel);
              clients.set(ws, clientInfo);
            }
            
            ws.send(JSON.stringify({
              type: 'subscription_result',
              channel: data.channel,
              success: true
            }));
          }
        }
        
        // Handle location update
        else if (data.type === 'location_update') {
          if (!clientInfo || !clientInfo.authenticated) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'NOT_AUTHENTICATED',
              message: 'Authentication required'
            }));
            return;
          }
          
          try {
            // Store the location update
            await storage.updateUserLocation(clientInfo.userId, {
              latitude: data.latitude,
              longitude: data.longitude
            });
            
            // Send confirmation to the client
            ws.send(JSON.stringify({
              type: 'location_update_result',
              success: true,
              timestamp: Date.now()
            }));
            
            // Broadcast to nearby users if needed
            broadcastToNearbyUsers(clientInfo.userId, {
              type: 'nearby_user',
              userId: clientInfo.userId,
              location: {
                latitude: data.latitude,
                longitude: data.longitude
              },
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Error updating location:', error);
            ws.send(JSON.stringify({
              type: 'location_update_result',
              success: false,
              error: 'Failed to update location'
            }));
          }
        }
        
        // Handle chat message
        else if (data.type === 'chat_message') {
          if (!clientInfo || !clientInfo.authenticated) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'NOT_AUTHENTICATED',
              message: 'Authentication required'
            }));
            return;
          }
          
          if (data.recipientId && data.threadId && data.content) {
            try {
              // Create a message object
              const messageData = {
                threadId: data.threadId,
                senderId: clientInfo.userId,
                content: data.content,
                receiverId: data.recipientId,
                status: "sent",
                read: false
              };
              
              // Store the message in the database
              const message = await storage.createChatMessage(messageData);
              
              // Send confirmation to the sender
              ws.send(JSON.stringify({
                type: 'message_sent',
                success: true,
                messageId: message.id,
                timestamp: Date.now()
              }));
              
              // Send the message to the recipient if they're online
              const delivered = sendToUser(data.recipientId, {
                type: 'new_message',
                message,
                timestamp: Date.now()
              });
              
              // If not delivered, mark as pending
              if (!delivered) {
                await storage.markMessageAsPending(message.id.toString());
              }
            } catch (error) {
              console.error('Error sending chat message:', error);
              ws.send(JSON.stringify({
                type: 'message_sent',
                success: false,
                error: 'Failed to send message'
              }));
            }
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'INVALID_MESSAGE',
              message: 'Missing required fields for message'
            }));
          }
        }
        
        // Handle message read status
        else if (data.type === 'mark_message_read') {
          if (!clientInfo || !clientInfo.authenticated) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'NOT_AUTHENTICATED',
              message: 'Authentication required'
            }));
            return;
          }
          
          if (data.messageId) {
            try {
              // Update message status in database
              await storage.markMessageAsRead(data.messageId, clientInfo.userId);
              
              // Notify the message sender if they're online
              const message = await storage.getChatMessageById(data.messageId);
              if (message) {
                sendToUser(message.senderId, {
                  type: 'message_read',
                  messageId: data.messageId,
                  threadId: message.threadId,
                  timestamp: Date.now()
                });
              }
            } catch (error) {
              console.error('Error marking message as read:', error);
            }
          }
        }
        
        // Handle client heartbeat (keeps connection alive)
        else if (data.type === 'heartbeat') {
          ws.send(JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        
        try {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'INVALID_FORMAT',
            message: 'Invalid message format'
          }));
        } catch (sendError) {
          console.error('Error sending error response:', sendError);
        }
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo && clientInfo.userId !== 'unknown') {
        console.log(`WebSocket client disconnected: ${clientInfo.userId}`);
        
        // Update user status to offline in the database
        try {
          storage.updateUserStatus(clientInfo.userId, 'offline');
        } catch (error) {
          console.error('Error updating user status to offline:', error);
        }
      } else {
        console.log('Unauthenticated WebSocket client disconnected');
      }
      
      clients.delete(ws);
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Function to send a message to a specific user
  // Returns true if message was delivered, false otherwise
  function sendToUser(userId: string, data: any): boolean {
    for (const [client, info] of clients.entries()) {
      if (info.userId === userId && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(data));
          return true; // Message delivered successfully
        } catch (error) {
          console.error(`Error sending message to user ${userId}:`, error);
          return false;
        }
      }
    }
    return false; // User not found or not connected
  }
  
  // Function to broadcast to users within a certain distance
  function broadcastToNearbyUsers(senderId: string, data: any) {
    // In a real implementation, this would filter users by distance
    // For now, we'll just broadcast to all authenticated users except the sender
    for (const [client, info] of clients.entries()) {
      if (info.userId !== 'unknown' && info.userId !== senderId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }
  }

  return httpServer;
}
