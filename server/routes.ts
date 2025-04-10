import express, { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import admin from "firebase-admin";
import { log as serverLog } from "./vite";
import { storage } from "./storage";
import { insertSearchHistorySchema, insertSearchPreferencesSchema } from "@shared/schema";

export enum ApiErrorCode {
  VALIDATION_ERROR = "validation_error",
  NOT_FOUND = "not_found",
  CONFLICT = "conflict",
  INTERNAL_SERVER_ERROR = "internal_server_error",
  UNAUTHORIZED = "unauthorized",
  FORBIDDEN = "forbidden"
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
    statusCode: number = 400,
    errorCode: ApiErrorCode = ApiErrorCode.VALIDATION_ERROR,
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
    res.status(statusCode).json(response);
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
        401,
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
        401,
        ApiErrorCode.UNAUTHORIZED
      );
    }
  };

  // Define a function for logging with consistent format
  function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    serverLog(message, 'routes');
  }

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
        409,
        ApiErrorCode.CONFLICT
      );
    } else {
      return sendErrorResponse(
        res,
        "A database error occurred. Please try again later.",
        500,
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        { message: error.message }
      );
    }
  }
  
  // Reputation system routes
  
  // Get reputation profile for a user
  app.get('/api/reputation/:userId', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { userId } = authReq.params;
      storage.getUserReputation(userId)
        .then((reputation) => {
          if (!reputation) {
            return sendErrorResponse(res, "User reputation not found", 404, ApiErrorCode.NOT_FOUND);
          }
          res.json({ reputation });
        })
        .catch((error) => {
          log(`Error getting reputation: ${error}`, 'error');
          return sendErrorResponse(res, "Failed to get reputation data", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
        });
    } catch (error) {
      log(`Error getting reputation: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to get reputation data", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Get reputation events for a user
  app.get('/api/reputation/:userId/events', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { userId } = authReq.params;
      const limit = authReq.query.limit ? Number(authReq.query.limit) : 20;
      
      // Only allow users to view their own reputation events
      if (userId !== authReq.user.uid) {
        return sendErrorResponse(res, "Unauthorized access to reputation events", 401, ApiErrorCode.UNAUTHORIZED);
      }
      
      Promise.all([
        storage.getReputationEvents(userId, limit),
        storage.getReputationEventTypes()
      ]).then(([events, eventTypes]) => {
        res.json({ events, eventTypes });
      }).catch((error) => {
        log(`Error getting reputation events: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to get reputation events", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error getting reputation events: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to get reputation events", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Get trust connections for a user
  app.get('/api/trust/:userId', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { userId } = authReq.params;
      
      Promise.all([
        storage.getTrustConnections(userId, false),
        storage.getTrustConnections(userId, true)
      ]).then(([trusted, trustedBy]) => {
        res.json({ trusted, trustedBy });
      }).catch((error) => {
        log(`Error getting trust connections: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to get trust connections", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error getting trust connections: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to get trust connections", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Create new trust connection
  app.post('/api/trust', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { trustedId, level, notes } = authReq.body;
      
      if (!trustedId || !level) {
        return sendErrorResponse(res, "Missing required fields", 400, ApiErrorCode.VALIDATION_ERROR);
      }
      
      // Make sure the user is not trying to trust themselves
      if (trustedId === authReq.user.uid) {
        return sendErrorResponse(res, "Cannot create trust connection with yourself", 400, ApiErrorCode.VALIDATION_ERROR);
      }
      
      // Check if a connection already exists
      storage.getTrustConnections(authReq.user.uid).then((existingConnections) => {
        const alreadyExists = existingConnections.some(conn => conn.trustedId === trustedId);
        
        if (alreadyExists) {
          return sendErrorResponse(res, "Trust connection already exists", 409, ApiErrorCode.CONFLICT);
        }
        
        // Create the trust connection
        storage.createTrustConnection({
          trusterId: authReq.user.uid,
          trustedId,
          level,
          notes
        }).then((connection) => {
          res.status(201).json({ connection });
        }).catch((error) => {
          log(`Error creating trust connection: ${error}`, 'error');
          return sendErrorResponse(res, "Failed to create trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
        });
      }).catch((error) => {
        log(`Error checking existing trust connections: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to create trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error creating trust connection: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to create trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Update trust connection
  app.patch('/api/trust/:trustedId', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { trustedId } = authReq.params;
      const { level, notes } = authReq.body;
      
      if (!level) {
        return sendErrorResponse(res, "Missing required fields", 400, ApiErrorCode.VALIDATION_ERROR);
      }
      
      // Update the trust connection
      storage.updateTrustConnection(
        authReq.user.uid,
        trustedId,
        level,
        notes
      ).then((connection) => {
        if (!connection) {
          return sendErrorResponse(res, "Trust connection not found", 404, ApiErrorCode.NOT_FOUND);
        }
        
        res.json({ connection });
      }).catch((error) => {
        log(`Error updating trust connection: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to update trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error updating trust connection: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to update trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Delete trust connection
  app.delete('/api/trust/:trustedId', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { trustedId } = authReq.params;
      
      // Get trust connections for the user
      storage.getTrustConnections(authReq.user.uid).then((connections) => {
        // Find the connection to delete
        const connectionToDelete = connections.find(conn => conn.trustedId === trustedId);
        
        if (!connectionToDelete) {
          return sendErrorResponse(res, "Trust connection not found", 404, ApiErrorCode.NOT_FOUND);
        }
        
        // Delete the trust connection
        storage.deleteTrustConnection(connectionToDelete.id).then(() => {
          res.status(204).send();
        }).catch((error) => {
          log(`Error deleting trust connection: ${error}`, 'error');
          return sendErrorResponse(res, "Failed to delete trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
        });
      }).catch((error) => {
        log(`Error finding trust connection to delete: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to delete trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error deleting trust connection: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to delete trust connection", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Create user rating
  app.post('/api/ratings', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { receiverId, score, comment, context, referenceId, isAnonymous } = authReq.body;
      
      if (!receiverId || !score || !context) {
        return sendErrorResponse(res, "Missing required fields", 400, ApiErrorCode.VALIDATION_ERROR);
      }
      
      // Make sure the user is not trying to rate themselves
      if (receiverId === authReq.user.uid) {
        return sendErrorResponse(res, "Cannot rate yourself", 400, ApiErrorCode.VALIDATION_ERROR);
      }
      
      // Create the rating
      storage.createUserRating({
        giverId: authReq.user.uid,
        receiverId,
        score,
        comment,
        context,
        referenceId,
        isAnonymous: isAnonymous || false
      }).then((rating) => {
        res.status(201).json({ rating });
      }).catch((error) => {
        log(`Error creating user rating: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to create user rating", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error creating user rating: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to create user rating", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Get ratings for a user
  app.get('/api/ratings/:userId', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { userId } = authReq.params;
      const asReceiver = authReq.query.asReceiver !== 'false'; // Default to true
      
      storage.getUserRatings(userId, asReceiver).then((ratings) => {
        // If requesting received ratings, exclude anonymous ratings unless it's the user's own profile
        const filteredRatings = asReceiver && userId !== authReq.user.uid
          ? ratings.filter(rating => !rating.isAnonymous)
          : ratings;
        
        res.json({ ratings: filteredRatings });
      }).catch((error) => {
        log(`Error getting user ratings: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to get user ratings", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error getting user ratings: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to get user ratings", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  // Search users endpoint (for trust connections)
  app.get('/api/users/search', authenticateUser, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const query = authReq.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json({ users: [] });
      }
      
      // Search for users
      storage.searchUsers(query, 10).then((users) => {
        // Exclude the current user from results
        const filteredUsers = users.filter(user => user.firebaseId !== authReq.user.uid);
        
        res.json({ users: filteredUsers });
      }).catch((error) => {
        log(`Error searching users: ${error}`, 'error');
        return sendErrorResponse(res, "Failed to search users", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
      });
    } catch (error) {
      log(`Error searching users: ${error}`, 'error');
      return sendErrorResponse(res, "Failed to search users", 500, ApiErrorCode.INTERNAL_SERVER_ERROR);
    }
  });
  
  // Serve public files from uploads directory
  app.get("/uploads/:fileId", (req, res, next) => {
    const filepath = path.join(__dirname, "../uploads", req.params.fileId);
    if (path.extname(filepath)) {
      return res.sendFile(filepath);
    }
    next();
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server on the same HTTP server but on a different path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  return httpServer;
}