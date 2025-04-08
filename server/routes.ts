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
