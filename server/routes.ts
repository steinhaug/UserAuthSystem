import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as admin from "firebase-admin";
import * as firebaseAdmin from "firebase-admin";
import { createHash, timingSafeEqual } from "crypto";
import multer from "multer";
import path from "path";
import fetch from "node-fetch";
import { User, Activity, InsertActivity, ActivityParticipant } from "@shared/schema";
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
  
  const httpServer = createServer(app);
  
  // Initialize WebSocket server on the same HTTP server but on a different path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  return httpServer;
}
