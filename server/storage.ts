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
  type InsertSearchPreferences
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
  getSearchSuggestions(userId: string, prefix: string): Promise<string[]>;
  getUserSearchPreferences(userId: string): Promise<SearchPreferences | undefined>;
  createSearchPreferences(preferences: InsertSearchPreferences): Promise<SearchPreferences>;
  updateSearchPreferences(userId: string, preferences: Partial<SearchPreferences>): Promise<SearchPreferences | undefined>;
}

import { db } from "./db";
import { eq, or, and, inArray } from "drizzle-orm";
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
    const [user] = await db.select().from(users).where(eq(users.firebaseId, firebaseId));
    return user;
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
      .orderBy(searchHistory.timestamp)
      .limit(limit);
  }
  
  async getSearchSuggestions(userId: string, prefix: string): Promise<string[]> {
    // Get user's search history
    const history = await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId));
    
    // Filter history items that start with the prefix
    const matchingQueries = history
      .map(item => item.query)
      .filter(query => query.toLowerCase().startsWith(prefix.toLowerCase()));
    
    // Remove duplicates and limit to 5 suggestions
    return [...new Set(matchingQueries)].slice(0, 5);
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
}

export const storage = new DatabaseStorage();
