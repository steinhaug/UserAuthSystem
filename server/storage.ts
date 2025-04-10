import { 
  users, 
  type User, 
  type InsertUser, 
  friends, 
  type Friend, 
  type InsertFriend,
  activities,
  type Activity,
  type InsertActivity,
  activityParticipants,
  type ActivityParticipant,
  type InsertActivityParticipant,
  chatMessages,
  type ChatMessage,
  type InsertChatMessage,
  chatThreads,
  type ChatThread,
  type InsertChatThread,
  challenges,
  type Challenge,
  type InsertChallenge,
  userChallenges,
  type UserChallenge,
  type InsertUserChallenge,
  bluetoothDevices,
  type BluetoothDevice,
  type InsertBluetoothDevice,
  searchHistory,
  type SearchHistory,
  type InsertSearchHistory,
  searchPreferences,
  type SearchPreferences,
  type InsertSearchPreferences,
  activityPreferences,
  type ActivityPreferences,
  type InsertActivityPreferences,
  activityRecommendations,
  type ActivityRecommendation,
  type InsertActivityRecommendation,
  userReputations,
  type UserReputation,
  type InsertUserReputation,
  reputationEvents,
  type ReputationEvent,
  type InsertReputationEvent,
  reputationEventTypes,
  type ReputationEventType,
  userRatings,
  type UserRating,
  type InsertUserRating,
  trustConnections,
  type TrustConnection,
  type InsertTrustConnection
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(firebaseId: string, userData: Partial<User>): Promise<User | undefined>;
  updateUserLocation(firebaseId: string, location: { latitude: number, longitude: number }): Promise<void>;
  
  // Friend methods
  getFriendsByUserId(userId: string): Promise<Friend[]>;
  createFriendRequest(userId: string, friendId: string): Promise<Friend>;
  updateFriendRequest(requestId: string, status: string): Promise<Friend | undefined>;
  
  // Activity methods
  getActivities(): Promise<Activity[]>;
  getActivityById(id: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  joinActivity(activityId: string, userId: string): Promise<ActivityParticipant>;
  
  // Chat methods
  getChatThreadsByUserId(userId: string): Promise<ChatThread[]>;
  getChatMessagesByThreadId(threadId: string): Promise<ChatMessage[]>;
  createChatThread(thread: InsertChatThread): Promise<ChatThread>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessageById(messageId: string): Promise<ChatMessage | undefined>;
  markMessageAsRead(messageId: string, userId: string): Promise<void>;
  markMessageAsPending(messageId: string): Promise<void>;
  getPendingMessagesForUser(userId: string): Promise<ChatMessage[]>;
  markMessagesAsDelivered(userId: string, messageIds: string[]): Promise<void>;
  
  // Challenge methods
  getChallenges(): Promise<Challenge[]>;
  getUserChallenges(userId: string): Promise<UserChallenge[]>;
  acceptChallenge(challengeId: string, userId: string): Promise<UserChallenge>;
  updateChallengeProgress(challengeId: string, userId: string, progress: number): Promise<UserChallenge | undefined>;
  
  // Bluetooth methods
  registerBluetoothDevice(device: InsertBluetoothDevice): Promise<BluetoothDevice>;
  getBluetoothDevicesByUserId(userId: string): Promise<BluetoothDevice[]>;
  
  // Search methods
  saveSearchHistory(searchData: InsertSearchHistory): Promise<SearchHistory>;
  getUserSearchHistory(userId: string, limit?: number): Promise<SearchHistory[]>;
  getSearchHistoryItem(id: number): Promise<SearchHistory | undefined>;
  updateSearchHistoryItem(id: number, data: Partial<SearchHistory>): Promise<SearchHistory>;
  getSearchSuggestions(userId: string, prefix: string): Promise<string[]>;
  getUserSearchPreferences(userId: string): Promise<SearchPreferences | undefined>;
  createSearchPreferences(preferences: InsertSearchPreferences): Promise<SearchPreferences>;
  updateSearchPreferences(userId: string, preferences: Partial<SearchPreferences>): Promise<SearchPreferences | undefined>;
  
  // Activity Preferences methods
  getUserActivityPreferences(userId: string): Promise<ActivityPreferences | undefined>;
  createActivityPreferences(preferences: InsertActivityPreferences): Promise<ActivityPreferences>;
  updateActivityPreferences(userId: string, preferences: Partial<ActivityPreferences>): Promise<ActivityPreferences | undefined>;
  
  // Activity Recommendations methods  
  getActivityRecommendationsForUser(userId: string): Promise<ActivityRecommendation[]>;
  createActivityRecommendation(recommendation: InsertActivityRecommendation): Promise<ActivityRecommendation>;
  updateActivityRecommendationStatus(id: number, status: string): Promise<ActivityRecommendation | undefined>;
  generateRecommendationsForUser(userId: string): Promise<ActivityRecommendation[]>;
  
  // Reputation System methods
  getUserReputation(userId: string): Promise<UserReputation | undefined>;
  createUserReputation(reputation: InsertUserReputation): Promise<UserReputation>;
  updateUserReputation(userId: string, data: Partial<UserReputation>): Promise<UserReputation | undefined>;
  
  // Reputation Events
  getReputationEvents(userId: string, limit?: number): Promise<ReputationEvent[]>;
  createReputationEvent(event: InsertReputationEvent): Promise<ReputationEvent>;
  getReputationEventTypes(): Promise<ReputationEventType[]>;
  
  // User Ratings
  getUserRatings(userId: string, asReceiver?: boolean): Promise<UserRating[]>;
  createUserRating(rating: InsertUserRating): Promise<UserRating>;
  
  // Trust Connections
  getTrustConnections(userId: string, asTrusted?: boolean): Promise<TrustConnection[]>;
  createTrustConnection(connection: InsertTrustConnection): Promise<TrustConnection>;
  updateTrustConnection(trusterId: string, trustedId: string, level: number, notes?: string): Promise<TrustConnection | undefined>;
  deleteTrustConnection(id: number): Promise<void>;
  
  // User Search
  searchUsers(query: string, limit?: number): Promise<User[]>;
}

import { db, pool } from "./db";
import { 
  eq, 
  or, 
  and, 
  inArray, 
  not as notInArray, 
  desc, 
  gt, 
  ne,
  SQL, sql
} from "drizzle-orm";
import { handleDatabaseOperation } from "./utils/errorHandler";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    try {
      // Handle development mode user specifically
      if (firebaseId === 'dev-user-1') {
        const [devUser] = await db.select().from(users).where(eq(users.firebaseId, 'dev-user-1'));
        if (devUser) {
          return devUser;
        } else {
          // Create the dev user if it doesn't exist
          console.log('Creating development mode user in database');
          const newDevUser: InsertUser = {
            firebaseId: 'dev-user-1',
            username: 'devuser',
            displayName: 'Dev User',
            email: 'dev@example.com',
            status: 'online',
            interests: ['development', 'testing'],
          };
          
          try {
            const [createdUser] = await db.insert(users).values(newDevUser).returning();
            return createdUser;
          } catch (innerError) {
            console.error('Error creating development user:', innerError);
            // Return a mock user object in case of error to prevent the application from crashing
            return {
              id: 1,
              firebaseId: 'dev-user-1',
              username: 'devuser',
              displayName: 'Dev User',
              email: 'dev@example.com',
              status: 'online',
              interests: ['development', 'testing'],
              createdAt: new Date(),
              lastSeen: new Date(),
            } as User;
          }
        }
      }
      
      // Normal flow for non-development users
      const [user] = await db.select().from(users).where(eq(users.firebaseId, firebaseId));
      return user;
    } catch (error) {
      console.error('Error in getUserByFirebaseId:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return handleDatabaseOperation(
      async () => {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      },
      `Failed to create user with username: ${insertUser.username}`,
      'user-creation'
    );
  }

  async updateUser(firebaseId: string, userData: Partial<User>): Promise<User | undefined> {
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, lastSeen: now })
      .where(eq(users.firebaseId, firebaseId))
      .returning();
    return updatedUser;
  }

  async updateUserLocation(firebaseId: string, location: { latitude: number, longitude: number }): Promise<void> {
    const now = new Date();
    await db
      .update(users)
      .set({ location, lastSeen: now })
      .where(eq(users.firebaseId, firebaseId));
  }

  // Friend methods
  async getFriendsByUserId(userId: string): Promise<Friend[]> {
    return db
      .select()
      .from(friends)
      .where(or(eq(friends.userId, userId), eq(friends.friendId, userId)));
  }

  async createFriendRequest(userId: string, friendId: string): Promise<Friend> {
    const [friend] = await db
      .insert(friends)
      .values({
        userId,
        friendId,
        status: 'pending'
      })
      .returning();
    return friend;
  }

  async updateFriendRequest(requestId: string, status: string): Promise<Friend | undefined> {
    const [updatedRequest] = await db
      .update(friends)
      .set({ status })
      .where(eq(friends.id, parseInt(requestId)))
      .returning();
    return updatedRequest;
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return db.select().from(activities);
  }

  async getActivityById(id: string): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, parseInt(id)));
    return activity;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    return handleDatabaseOperation(
      async () => {
        const [newActivity] = await db
          .insert(activities)
          .values(activity)
          .returning();
        return newActivity;
      },
      `Failed to create activity: ${activity.title}`,
      'activity-creation'
    );
  }

  async joinActivity(activityId: string, userId: string): Promise<ActivityParticipant> {
    const [participant] = await db
      .insert(activityParticipants)
      .values({
        activityId: parseInt(activityId),
        userId
      })
      .returning();
    return participant;
  }

  // Chat methods
  async getChatThreadsByUserId(userId: string): Promise<ChatThread[]> {
    // This is a simplification - in a real app, you'd need a joining table to handle this properly
    // since participants is an array
    const threads = await db.select().from(chatThreads);
    return threads.filter(thread => thread.participants.includes(userId));
  }

  async getChatMessagesByThreadId(threadId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId));
  }

  async createChatThread(thread: InsertChatThread): Promise<ChatThread> {
    const [newThread] = await db
      .insert(chatThreads)
      .values(thread)
      .returning();
    return newThread;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    return handleDatabaseOperation(
      async () => {
        const [newMessage] = await db
          .insert(chatMessages)
          .values(message)
          .returning();
        
        // Update the last message ID and updated time in the chat thread
        await db
          .update(chatThreads)
          .set({ 
            lastMessageId: newMessage.id,
            updatedAt: new Date()
          })
          .where(eq(chatThreads.id, parseInt(message.threadId)));
        
        return newMessage;
      },
      `Failed to create chat message in thread: ${message.threadId}`,
      'message-creation'
    );
  }

  async getChatMessageById(messageId: string): Promise<ChatMessage | undefined> {
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, parseInt(messageId)));
    return message;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const now = new Date();
    await db
      .update(chatMessages)
      .set({ 
        read: true,
        readAt: now,
        updatedAt: now
      })
      .where(
        and(
          eq(chatMessages.id, parseInt(messageId)),
          eq(chatMessages.receiverId, userId)
        )
      );
  }

  async markMessageAsPending(messageId: string): Promise<void> {
    const now = new Date();
    await db
      .update(chatMessages)
      .set({ 
        status: 'pending',
        updatedAt: now
      })
      .where(eq(chatMessages.id, parseInt(messageId)));
  }

  async getPendingMessagesForUser(userId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.receiverId, userId),
          eq(chatMessages.status, 'pending')
        )
      );
  }

  async markMessagesAsDelivered(userId: string, messageIds: string[]): Promise<void> {
    // Convert string ids to numbers
    const numericIds = messageIds.map(id => parseInt(id));
    const now = new Date();
    
    await db
      .update(chatMessages)
      .set({ 
        status: 'delivered',
        deliveredAt: now,
        updatedAt: now
      })
      .where(
        and(
          eq(chatMessages.receiverId, userId),
          inArray(chatMessages.id, numericIds)
        )
      );
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        status,
        lastSeen: new Date()
      })
      .where(eq(users.firebaseId, userId));
  }

  // Challenge methods
  async getChallenges(): Promise<Challenge[]> {
    return db.select().from(challenges);
  }

  async getUserChallenges(userId: string): Promise<UserChallenge[]> {
    return db
      .select()
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId));
  }

  async acceptChallenge(challengeId: string, userId: string): Promise<UserChallenge> {
    const [userChallenge] = await db
      .insert(userChallenges)
      .values({
        userId,
        challengeId: parseInt(challengeId),
        progress: 0,
        completed: false
      })
      .returning();
    return userChallenge;
  }

  async updateChallengeProgress(challengeId: string, userId: string, progress: number): Promise<UserChallenge | undefined> {
    return handleDatabaseOperation(
      async () => {
        // Get the challenge to check if the progress meets the target
        const [challenge] = await db
          .select()
          .from(challenges)
          .where(eq(challenges.id, parseInt(challengeId)));
        
        // Determine if the challenge is completed
        const completed = challenge ? progress >= challenge.target : false;
        const completedAt = completed ? new Date() : null;
        
        // Update the user challenge
        const [updatedChallenge] = await db
          .update(userChallenges)
          .set({ 
            progress, 
            completed,
            completedAt
          })
          .where(
            and(
              eq(userChallenges.challengeId, parseInt(challengeId)),
              eq(userChallenges.userId, userId)
            )
          )
          .returning();
        
        return updatedChallenge;
      },
      `Failed to update challenge progress for user ${userId} on challenge ${challengeId}`,
      'challenge-progress'
    );
  }

  // Bluetooth methods
  async registerBluetoothDevice(device: InsertBluetoothDevice): Promise<BluetoothDevice> {
    return handleDatabaseOperation(
      async () => {
        // Check if device already exists
        const [existingDevice] = await db
          .select()
          .from(bluetoothDevices)
          .where(eq(bluetoothDevices.deviceId, device.deviceId));
        
        if (existingDevice) {
          // Update last seen time
          const [updatedDevice] = await db
            .update(bluetoothDevices)
            .set({ lastSeen: new Date() })
            .where(eq(bluetoothDevices.deviceId, device.deviceId))
            .returning();
          return updatedDevice;
        }
        
        // Create new device
        const [newDevice] = await db
          .insert(bluetoothDevices)
          .values(device)
          .returning();
        return newDevice;
      },
      `Failed to register Bluetooth device: ${device.deviceId}`,
      'bluetooth-device-registration'
    );
  }

  async getBluetoothDevicesByUserId(userId: string): Promise<BluetoothDevice[]> {
    return db
      .select()
      .from(bluetoothDevices)
      .where(eq(bluetoothDevices.userId, userId));
  }
  
  // Search methods
  async saveSearchHistory(searchData: InsertSearchHistory): Promise<SearchHistory> {
    return handleDatabaseOperation(
      async () => {
        const [history] = await db
          .insert(searchHistory)
          .values(searchData)
          .returning();
        return history;
      },
      `Failed to save search history for query: ${searchData.query}`,
      'search-history-creation'
    );
  }
  
  async getUserSearchHistory(userId: string, limit: number = 10): Promise<SearchHistory[]> {
    return db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.timestamp)) // Show newest first
      .limit(limit);
  }
  
  // Get a specific search history item by ID
  async getSearchHistoryItem(id: number): Promise<SearchHistory | undefined> {
    const [item] = await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.id, id));
    return item;
  }
  
  // Update a search history item (tags, notes, favorite status)
  async updateSearchHistoryItem(id: number, data: Partial<SearchHistory>): Promise<SearchHistory> {
    // Make sure we only update allowed fields
    const allowedUpdates: Partial<SearchHistory> = {};
    
    if (data.tags !== undefined) allowedUpdates.tags = data.tags;
    if (data.notes !== undefined) allowedUpdates.notes = data.notes;
    if (data.favorite !== undefined) allowedUpdates.favorite = data.favorite;
    
    const [updated] = await db
      .update(searchHistory)
      .set(allowedUpdates)
      .where(eq(searchHistory.id, id))
      .returning();
    
    return updated;
  }
  
  async getSearchSuggestions(userId: string, prefix: string): Promise<string[]> {
    // Get user's search history, ordered by most recent first
    const history = await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.timestamp));
    
    // Get user's preferences
    const [preferences] = await db
      .select()
      .from(searchPreferences)
      .where(eq(searchPreferences.userId, userId));
    
    // All queries from history, with duplicates removed
    const allUniqueQueries = [...new Set(history.map(item => item.query))];
    
    // Different types of suggestions with weighted scores
    let scoredSuggestions: { query: string; score: number }[] = [];
    
    // Process each unique query
    allUniqueQueries.forEach(query => {
      // Base score starts at 0
      let score = 0;
      
      // Check if query matches prefix (case insensitive)
      const matchesPrefix = query.toLowerCase().includes(prefix.toLowerCase());
      if (!matchesPrefix) return; // Skip if no match
      
      // Exact prefix match gets higher score than partial match
      if (query.toLowerCase().startsWith(prefix.toLowerCase())) {
        score += 5;
      } else {
        score += 3;
      }
      
      // Add to score for each occurrence in history (frequency)
      const frequency = history.filter(item => item.query === query).length;
      score += Math.min(frequency, 3); // Cap at 3 to avoid overwhelming frequency bias
      
      // Add to score for recent searches (recency)
      const mostRecentSearch = history.find(item => item.query === query);
      if (mostRecentSearch) {
        const daysSinceSearch = (Date.now() - new Date(mostRecentSearch.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        // More recent searches get higher scores
        if (daysSinceSearch < 1) score += 3;       // Today
        else if (daysSinceSearch < 7) score += 2;  // This week
        else if (daysSinceSearch < 30) score += 1; // This month
      }
      
      // Add to score for successful searches
      const successfulSearches = history.filter(item => item.query === query && item.successful);
      score += Math.min(successfulSearches.length, 2);
      
      // Add to score for matches with favorite categories
      if (preferences?.favoriteCategories) {
        const matchesCategory = preferences.favoriteCategories.some(
          category => query.toLowerCase().includes(category.toLowerCase())
        );
        if (matchesCategory) score += 2;
      }
      
      scoredSuggestions.push({ query, score });
    });
    
    // Sort by score (descending) and get top 5
    return scoredSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(suggestion => suggestion.query);
  }
  
  async getUserSearchPreferences(userId: string): Promise<SearchPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(searchPreferences)
      .where(eq(searchPreferences.userId, userId));
    
    return preferences;
  }
  
  async createSearchPreferences(preferences: InsertSearchPreferences): Promise<SearchPreferences> {
    return handleDatabaseOperation(
      async () => {
        // Check if user already has preferences
        const [existingPrefs] = await db
          .select()
          .from(searchPreferences)
          .where(eq(searchPreferences.userId, preferences.userId));
        
        if (existingPrefs) {
          // Update existing preferences
          const [updatedPrefs] = await db
            .update(searchPreferences)
            .set({ 
              ...preferences,
              updatedAt: new Date()
            })
            .where(eq(searchPreferences.userId, preferences.userId))
            .returning();
          return updatedPrefs;
        }
        
        // Create new preferences
        const [newPrefs] = await db
          .insert(searchPreferences)
          .values(preferences)
          .returning();
        return newPrefs;
      },
      `Failed to create search preferences for user: ${preferences.userId}`,
      'search-preferences-creation'
    );
  }
  
  async updateSearchPreferences(userId: string, preferences: Partial<SearchPreferences>): Promise<SearchPreferences | undefined> {
    const [updatedPrefs] = await db
      .update(searchPreferences)
      .set({ 
        ...preferences,
        updatedAt: new Date()
      })
      .where(eq(searchPreferences.userId, userId))
      .returning();
    
    return updatedPrefs;
  }
  
  // Activity Preferences methods
  async getUserActivityPreferences(userId: string): Promise<ActivityPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(activityPreferences)
      .where(eq(activityPreferences.userId, userId));
    return preferences;
  }
  
  async createActivityPreferences(preferences: InsertActivityPreferences): Promise<ActivityPreferences> {
    return handleDatabaseOperation(
      async () => {
        const [newPreferences] = await db
          .insert(activityPreferences)
          .values(preferences)
          .returning();
        return newPreferences;
      },
      `Failed to create activity preferences for user: ${preferences.userId}`,
      'activity-preferences-creation'
    );
  }
  
  async updateActivityPreferences(userId: string, preferences: Partial<ActivityPreferences>): Promise<ActivityPreferences | undefined> {
    const [updatedPrefs] = await db
      .update(activityPreferences)
      .set({ 
        ...preferences,
        updatedAt: new Date()
      })
      .where(eq(activityPreferences.userId, userId))
      .returning();
    
    return updatedPrefs;
  }
  
  // Activity Recommendations methods
  async getActivityRecommendationsForUser(userId: string): Promise<ActivityRecommendation[]> {
    return db
      .select()
      .from(activityRecommendations)
      .where(eq(activityRecommendations.userId, userId))
      .orderBy(desc(activityRecommendations.score));
  }
  
  async createActivityRecommendation(recommendation: InsertActivityRecommendation): Promise<ActivityRecommendation> {
    return handleDatabaseOperation(
      async () => {
        const [newRecommendation] = await db
          .insert(activityRecommendations)
          .values(recommendation)
          .returning();
        return newRecommendation;
      },
      `Failed to create activity recommendation for user: ${recommendation.userId}`,
      'activity-recommendation-creation'
    );
  }
  
  async updateActivityRecommendationStatus(id: number, status: string): Promise<ActivityRecommendation | undefined> {
    const [updatedRecommendation] = await db
      .update(activityRecommendations)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(activityRecommendations.id, id))
      .returning();
    
    return updatedRecommendation;
  }
  
  async generateRecommendationsForUser(userId: string): Promise<ActivityRecommendation[]> {
    return handleDatabaseOperation(
      async () => {
        // Get user's activity preferences
        const [userPreferences] = await db
          .select()
          .from(activityPreferences)
          .where(eq(activityPreferences.userId, userId));
        
        if (!userPreferences) {
          throw new Error('User activity preferences not found');
        }
        
        // Get user's past activity participations to avoid recommending duplicates
        const userParticipations = await db
          .select()
          .from(activityParticipants)
          .where(eq(activityParticipants.userId, userId));
        
        const participatedActivityIds = userParticipations.map(p => p.activityId);
        
        // Get other users' activities that match the user's preferences
        const now = new Date();
        
        // Build query with drizzle-orm directly
        // Get activities that haven't started yet and created by other users
        let candidateActivities = await db
          .select()
          .from(activities)
          .where(
            and(
              gt(activities.startTime, now),
              ne(activities.creatorId, userId)
            )
          );
        
        // If there are activities the user has participated in, filter them out
        if (participatedActivityIds.length > 0) {
          // Use array.filter to do the filtering in-memory 
          // since we're having issues with the SQL generation
          candidateActivities = candidateActivities.filter(activity => 
            !participatedActivityIds.includes(activity.id)
          );
        }
        
        // Score and filter activities based on user preferences
        const scoredActivities = candidateActivities.map(activity => {
          let score = 50; // Base score
          
          // Category match
          if (userPreferences.preferredCategories.includes(activity.category)) {
            score += 20;
          }
          
          // Day of week match
          const activityDay = new Date(activity.startTime).getDay();
          if (userPreferences.preferredDayOfWeek.includes(activityDay)) {
            score += 10;
          }
          
          // Time of day match
          const activityHour = new Date(activity.startTime).getHours();
          let timeOfDay = 'morning';
          if (activityHour >= 12 && activityHour < 17) timeOfDay = 'afternoon';
          else if (activityHour >= 17 && activityHour < 21) timeOfDay = 'evening';
          else if (activityHour >= 21 || activityHour < 6) timeOfDay = 'night';
          
          if (userPreferences.preferredTimeOfDay.includes(timeOfDay)) {
            score += 10;
          }
          
          // Distance consideration (if location is available)
          // This is a simplification - in a real app you'd calculate the actual distance
          if (activity.location && userPreferences.preferredDistance) {
            // Simulate distance calculation - in a real app you'd use actual coordinates
            const distanceScore = Math.min(20, Math.round(20 * (userPreferences.preferredDistance / 20)));
            score += distanceScore;
          }
          
          // Match with participation history
          let historyMatch = false;
          
          // Safely check if participationHistory exists and is an array
          if (userPreferences.participationHistory && 
              Array.isArray(userPreferences.participationHistory)) {
            historyMatch = userPreferences.participationHistory.some(
              (history: any) => {
                if (history && typeof history === 'object') {
                  return history.category === activity.category && 
                         typeof history.count === 'number' && 
                         history.count > 0;
                }
                return false;
              }
            );
          }
          
          if (historyMatch) {
            score += 10;
          }
          
          return {
            activityId: activity.id,
            score,
            reason: generateRecommendationReason(activity, userPreferences, score)
          };
        });
        
        // Filter for activities with a score above threshold
        const highScoredActivities = scoredActivities
          .filter(activity => activity.score >= 60)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10); // Limit to top 10
        
        // Create recommendation records
        const recommendations: ActivityRecommendation[] = [];
        
        for (const activity of highScoredActivities) {
          const [recommendation] = await db
            .insert(activityRecommendations)
            .values({
              userId,
              activityId: activity.activityId,
              score: activity.score,
              status: 'pending',
              reason: activity.reason
            })
            .returning();
          
          recommendations.push(recommendation);
        }
        
        return recommendations;
      },
      `Failed to generate activity recommendations for user: ${userId}`,
      'activity-recommendation-generation'
    );
  }

  // Reputation System methods
  async getUserReputation(userId: string): Promise<UserReputation | undefined> {
    const [reputation] = await db
      .select()
      .from(userReputations)
      .where(eq(userReputations.userId, userId));
    return reputation;
  }

  async createUserReputation(reputation: InsertUserReputation): Promise<UserReputation> {
    return handleDatabaseOperation(
      async () => {
        const [newReputation] = await db
          .insert(userReputations)
          .values(reputation)
          .returning();
        return newReputation;
      },
      `Failed to create reputation profile for user: ${reputation.userId}`,
      'reputation-creation'
    );
  }

  async updateUserReputation(userId: string, data: Partial<UserReputation>): Promise<UserReputation | undefined> {
    // Make sure we only update allowed fields
    const allowedUpdates: Partial<UserReputation> = {};
    
    if (data.overallScore !== undefined) allowedUpdates.overallScore = data.overallScore;
    if (data.reliabilityScore !== undefined) allowedUpdates.reliabilityScore = data.reliabilityScore;
    if (data.safetyScore !== undefined) allowedUpdates.safetyScore = data.safetyScore;
    if (data.communityScore !== undefined) allowedUpdates.communityScore = data.communityScore;
    if (data.activityCount !== undefined) allowedUpdates.activityCount = data.activityCount;
    if (data.verificationLevel !== undefined) allowedUpdates.verificationLevel = data.verificationLevel;
    if (data.isVerified !== undefined) allowedUpdates.isVerified = data.isVerified;
    
    allowedUpdates.updatedAt = new Date();
    
    const [updatedReputation] = await db
      .update(userReputations)
      .set(allowedUpdates)
      .where(eq(userReputations.userId, userId))
      .returning();
    
    return updatedReputation;
  }

  // Reputation Events
  async getReputationEvents(userId: string, limit: number = 20): Promise<ReputationEvent[]> {
    return db
      .select()
      .from(reputationEvents)
      .where(eq(reputationEvents.userId, userId))
      .orderBy(desc(reputationEvents.createdAt))
      .limit(limit);
  }

  async createReputationEvent(event: InsertReputationEvent): Promise<ReputationEvent> {
    return handleDatabaseOperation(
      async () => {
        // Create the reputation event
        const [newEvent] = await db
          .insert(reputationEvents)
          .values(event)
          .returning();
        
        // Get the event type to determine the impact
        const [eventType] = await db
          .select()
          .from(reputationEventTypes)
          .where(eq(reputationEventTypes.id, event.eventTypeId));
        
        if (!eventType) {
          throw new Error(`Event type not found: ${event.eventTypeId}`);
        }
        
        // Update the user's reputation scores
        const [userReputation] = await db
          .select()
          .from(userReputations)
          .where(eq(userReputations.userId, event.userId));
        
        if (userReputation) {
          // Update the appropriate score based on the event category
          const updates: Partial<UserReputation> = {
            updatedAt: new Date()
          };
          
          // Apply the impact to the specific category score
          switch (eventType.category) {
            case 'reliability':
              updates.reliabilityScore = Math.max(0, Math.min(100, userReputation.reliabilityScore + eventType.impact));
              break;
            case 'safety':
              updates.safetyScore = Math.max(0, Math.min(100, userReputation.safetyScore + eventType.impact));
              break;
            case 'community':
              updates.communityScore = Math.max(0, Math.min(100, userReputation.communityScore + eventType.impact));
              break;
            case 'verification':
              updates.verificationLevel = Math.max(0, Math.min(5, userReputation.verificationLevel + Math.floor(eventType.impact)));
              break;
          }
          
          // Recalculate the overall score as the average of the three main scores
          const reliabilityWeight = 0.35;
          const safetyWeight = 0.35;
          const communityWeight = 0.3;
          
          const reliabilityScore = updates.reliabilityScore !== undefined ? updates.reliabilityScore : userReputation.reliabilityScore;
          const safetyScore = updates.safetyScore !== undefined ? updates.safetyScore : userReputation.safetyScore;
          const communityScore = updates.communityScore !== undefined ? updates.communityScore : userReputation.communityScore;
          
          updates.overallScore = (
            reliabilityScore * reliabilityWeight +
            safetyScore * safetyWeight +
            communityScore * communityWeight
          );
          
          // Update the user reputation
          await db
            .update(userReputations)
            .set(updates)
            .where(eq(userReputations.userId, event.userId));
        }
        
        return newEvent;
      },
      `Failed to create reputation event for user: ${event.userId}`,
      'reputation-event-creation'
    );
  }

  async getReputationEventTypes(): Promise<ReputationEventType[]> {
    return db
      .select()
      .from(reputationEventTypes)
      .where(eq(reputationEventTypes.isActive, true))
      .orderBy(desc(reputationEventTypes.impact));
  }

  // User Ratings
  async getUserRatings(userId: string, asReceiver: boolean = true): Promise<UserRating[]> {
    if (asReceiver) {
      return db
        .select()
        .from(userRatings)
        .where(eq(userRatings.receiverId, userId))
        .orderBy(desc(userRatings.createdAt));
    } else {
      return db
        .select()
        .from(userRatings)
        .where(eq(userRatings.giverId, userId))
        .orderBy(desc(userRatings.createdAt));
    }
  }

  async createUserRating(rating: InsertUserRating): Promise<UserRating> {
    return handleDatabaseOperation(
      async () => {
        // Create the rating
        const [newRating] = await db
          .insert(userRatings)
          .values(rating)
          .returning();
        
        // Create a corresponding reputation event based on the rating score
        let eventTypeId: number;
        
        if (rating.score >= 4) {
          // 4-5 stars = good rating
          eventTypeId = 6; // received_good_rating
        } else if (rating.score == 3) {
          // 3 stars = neutral rating
          eventTypeId = 7; // received_neutral_rating
        } else {
          // 1-2 stars = bad rating
          eventTypeId = 8; // received_bad_rating
        }
        
        // Create the reputation event
        await this.createReputationEvent({
          userId: rating.receiverId,
          eventTypeId,
          referenceId: `rating_${newRating.id}`,
          referenceType: 'rating',
          value: newRating.score,
          details: JSON.stringify({
            rating_id: newRating.id,
            context: newRating.context,
            score: newRating.score,
            from_user: rating.isAnonymous ? 'anonymous' : rating.giverId
          })
        });
        
        return newRating;
      },
      `Failed to create user rating from ${rating.giverId} to ${rating.receiverId}`,
      'user-rating-creation'
    );
  }

  // Trust Connections
  async getTrustConnections(userId: string, asTrusted: boolean = false): Promise<TrustConnection[]> {
    if (asTrusted) {
      return db
        .select()
        .from(trustConnections)
        .where(eq(trustConnections.trustedId, userId))
        .orderBy(desc(trustConnections.level));
    } else {
      return db
        .select()
        .from(trustConnections)
        .where(eq(trustConnections.trusterId, userId))
        .orderBy(desc(trustConnections.level));
    }
  }

  async createTrustConnection(connection: InsertTrustConnection): Promise<TrustConnection> {
    return handleDatabaseOperation(
      async () => {
        // Check if a connection already exists
        const [existingConnection] = await db
          .select()
          .from(trustConnections)
          .where(
            and(
              eq(trustConnections.trusterId, connection.trusterId),
              eq(trustConnections.trustedId, connection.trustedId)
            )
          );
        
        if (existingConnection) {
          throw new Error('Trust connection already exists between these users');
        }
        
        // Create the trust connection
        const [newConnection] = await db
          .insert(trustConnections)
          .values(connection)
          .returning();
        
        // Create a corresponding reputation event
        await this.createReputationEvent({
          userId: connection.trustedId,
          eventTypeId: 12, // trusted_by_user
          referenceId: `trust_${newConnection.id}`,
          referenceType: 'trust',
          value: 1.0,
          details: JSON.stringify({
            trust_connection_id: newConnection.id,
            level: newConnection.level,
            from_user: connection.trusterId
          })
        });
        
        return newConnection;
      },
      `Failed to create trust connection from ${connection.trusterId} to ${connection.trustedId}`,
      'trust-connection-creation'
    );
  }

  async updateTrustConnection(trusterId: string, trustedId: string, level: number, notes?: string): Promise<TrustConnection | undefined> {
    const [existingConnection] = await db
      .select()
      .from(trustConnections)
      .where(
        and(
          eq(trustConnections.trusterId, trusterId),
          eq(trustConnections.trustedId, trustedId)
        )
      );
    
    if (!existingConnection) {
      return undefined;
    }
    
    const updates: Partial<TrustConnection> = {
      level,
      updatedAt: new Date()
    };
    
    if (notes !== undefined) {
      updates.notes = notes;
    }
    
    const [updatedConnection] = await db
      .update(trustConnections)
      .set(updates)
      .where(
        and(
          eq(trustConnections.trusterId, trusterId),
          eq(trustConnections.trustedId, trustedId)
        )
      )
      .returning();
    
    // If trust level increased, create a reputation event
    if (level > existingConnection.level) {
      await this.createReputationEvent({
        userId: trustedId,
        eventTypeId: 13, // trust_connection_level_increase
        referenceId: `trust_${existingConnection.id}`,
        referenceType: 'trust',
        value: 0.5,
        details: JSON.stringify({
          trust_connection_id: existingConnection.id,
          old_level: existingConnection.level,
          new_level: level,
          from_user: trusterId
        })
      });
    }
    
    return updatedConnection;
  }

  async deleteTrustConnection(id: number): Promise<void> {
    await db
      .delete(trustConnections)
      .where(eq(trustConnections.id, id));
  }
  
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    // Search by username, displayName, or email
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    
    return db
      .select()
      .from(users)
      .where(
        or(
          sql`LOWER(${users.username}) LIKE ${lowercaseQuery}`,
          sql`LOWER(${users.displayName}) LIKE ${lowercaseQuery}`,
          sql`LOWER(${users.email}) LIKE ${lowercaseQuery}`
        )
      )
      .limit(limit);
  }
}

// Helper function for generating recommendation reasons
function generateRecommendationReason(
  activity: Activity, 
  preferences: ActivityPreferences, 
  score: number
): string {
  const reasons = [];
  
  if (preferences.preferredCategories.includes(activity.category)) {
    reasons.push(`This ${activity.category} activity matches your preferred categories`);
  }
  
  const activityDay = new Date(activity.startTime).getDay();
  if (preferences.preferredDayOfWeek.includes(activityDay)) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    reasons.push(`This activity happens on ${days[activityDay]}, which matches your availability`);
  }
  
  // Suggest based on match score
  if (score >= 80) {
    reasons.push("This activity is a great match for your preferences");
  } else if (score >= 70) {
    reasons.push("This activity matches your preferences well");
  } else {
    reasons.push("This activity may interest you based on your preferences");
  }
  
  // Join the reasons with semicolons for readability
  return reasons.join('; ');
}

export const storage = new DatabaseStorage();
