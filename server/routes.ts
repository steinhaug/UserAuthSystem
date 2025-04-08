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

// Initialize Firebase Admin
try {
  // Check if Firebase Admin has already been initialized
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
    console.log("Firebase Admin initialized successfully");
  }
} catch (error) {
  console.error("Firebase admin initialization error:", error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware with extended Request type
  interface AuthenticatedRequest extends Request {
    user?: any;
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
      const user = await storage.getUserByFirebaseId(req.user.uid);
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
      handleApiDatabaseError(res, error);
    }
  });

  app.post("/api/users/profile", authenticateUser, async (req, res) => {
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
      
      const activity = await storage.createActivity({
        ...req.body,
        creatorId: req.user.uid,
      });
      
      res.status(201).json(activity);
    } catch (error) {
      handleApiDatabaseError(res, error);
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

  const httpServer = createServer(app);

  return httpServer;
}
