import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, foreignKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseId: text("firebase_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  photoURL: text("photo_url"),
  status: text("status").default("online"),
  location: jsonb("location"),
  interests: text("interests").array(),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
}, (table) => {
  return {
    firebaseIdIdx: index("users_firebase_id_idx").on(table.firebaseId),
    usernameIdx: index("users_username_idx").on(table.username),
    emailIdx: index("users_email_idx").on(table.email),
    statusIdx: index("users_status_idx").on(table.status),
    lastSeenIdx: index("users_last_seen_idx").on(table.lastSeen)
  };
});

// Define user relations
export const usersRelations = relations(users, ({ many }) => ({
  sentFriendRequests: many(friends, { relationName: "userFriends" }),
  receivedFriendRequests: many(friends, { relationName: "friendUser" }),
  activities: many(activities),
  activityParticipations: many(activityParticipants),
  sentMessages: many(chatMessages, { relationName: "sender" }),
  receivedMessages: many(chatMessages, { relationName: "receiver" }),
  userChallenges: many(userChallenges),
  bluetoothDevices: many(bluetoothDevices),
}));

// Friends table
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  friendId: text("friend_id").notNull().references(() => users.firebaseId),
  status: text("status").notNull(), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("friends_user_id_idx").on(table.userId),
    friendIdIdx: index("friends_friend_id_idx").on(table.friendId),
    statusIdx: index("friends_status_idx").on(table.status),
    userFriendIdx: index("friends_user_friend_idx").on(table.userId, table.friendId)
  };
});

// Define friend relations
export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.firebaseId],
    relationName: "userFriends",
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.firebaseId],
    relationName: "friendUser",
  }),
}));

// Activities table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  creatorId: text("creator_id").notNull().references(() => users.firebaseId),
  location: jsonb("location").notNull(),
  locationName: text("location_name").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  maxParticipants: integer("max_participants").notNull(),
  category: text("category").notNull(), // sports, social, food_drinks, games, other
  status: text("status").notNull(), // upcoming, active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    creatorIdIdx: index("activities_creator_id_idx").on(table.creatorId),
    categoryIdx: index("activities_category_idx").on(table.category),
    statusIdx: index("activities_status_idx").on(table.status),
    startTimeIdx: index("activities_start_time_idx").on(table.startTime),
    locationNameIdx: index("activities_location_name_idx").on(table.locationName)
  };
});

// Define activities relations
export const activitiesRelations = relations(activities, ({ one, many }) => ({
  creator: one(users, {
    fields: [activities.creatorId],
    references: [users.firebaseId],
  }),
  participants: many(activityParticipants),
}));

// Activity participants table
export const activityParticipants = pgTable("activity_participants", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activities.id),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => {
  return {
    activityIdIdx: index("activity_participants_activity_id_idx").on(table.activityId),
    userIdIdx: index("activity_participants_user_id_idx").on(table.userId),
    activityUserIdx: index("activity_participants_activity_user_idx").on(table.activityId, table.userId)
  };
});

// Define activity participants relations
export const activityParticipantsRelations = relations(activityParticipants, ({ one }) => ({
  activity: one(activities, {
    fields: [activityParticipants.activityId],
    references: [activities.id],
  }),
  user: one(users, {
    fields: [activityParticipants.userId],
    references: [users.firebaseId],
  }),
}));

// Chat threads table
export const chatThreads = pgTable("chat_threads", {
  id: serial("id").primaryKey(),
  participants: text("participants").array().notNull(),
  lastMessageId: integer("last_message_id"),
  isBluetoothChat: boolean("is_bluetooth_chat").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat threads relations will be defined after chatMessages

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  senderId: text("sender_id").notNull().references(() => users.firebaseId),
  receiverId: text("receiver_id").notNull().references(() => users.firebaseId),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  type: text("type").default("text"), // text, system, friend_request
  status: text("status").default("sent"), // sent, delivered, pending, failed
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    threadIdIdx: index("chat_messages_thread_id_idx").on(table.threadId),
    senderIdIdx: index("chat_messages_sender_id_idx").on(table.senderId),
    receiverIdIdx: index("chat_messages_receiver_id_idx").on(table.receiverId),
    createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
    readStatusIdx: index("chat_messages_read_status_idx").on(table.read),
    messageStatusIdx: index("chat_messages_status_idx").on(table.status)
  };
});

// Define chat messages relations
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.firebaseId],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [chatMessages.receiverId],
    references: [users.firebaseId],
    relationName: "receiver",
  }),
}));

// Now define chat threads relations after chatMessages is defined
export const chatThreadsRelations = relations(chatThreads, ({ many }) => ({
  messages: many(chatMessages),
}));

// Challenges table
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  points: integer("points").notNull(),
  target: integer("target").notNull(),
  type: text("type").notNull(), // chat_new, visit_hotspot, create_activity, join_activity, add_friends
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
});

// Challenges relations will be defined after userChallenges

// User challenges table
export const userChallenges = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define user challenges relations
export const userChallengesRelations = relations(userChallenges, ({ one }) => ({
  user: one(users, {
    fields: [userChallenges.userId],
    references: [users.firebaseId],
  }),
  challenge: one(challenges, {
    fields: [userChallenges.challengeId],
    references: [challenges.id],
  }),
}));

// Now define challenges relations after userChallenges is defined
export const challengesRelations = relations(challenges, ({ many }) => ({
  userChallenges: many(userChallenges),
}));

// Bluetooth devices table
export const bluetoothDevices = pgTable("bluetooth_devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  name: text("name"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

// Define bluetooth devices relations
export const bluetoothDevicesRelations = relations(bluetoothDevices, ({ one }) => ({
  user: one(users, {
    fields: [bluetoothDevices.userId],
    references: [users.firebaseId],
  }),
}));

// Search history table
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  query: text("query").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  resultCount: integer("result_count"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  category: text("category"), // e.g., "restaurant", "cafe", etc.
  successful: boolean("successful").notNull().default(true)
}, (table) => {
  return {
    userIdIdx: index("search_history_user_id_idx").on(table.userId),
    timestampIdx: index("search_history_timestamp_idx").on(table.timestamp),
    categoryIdx: index("search_history_category_idx").on(table.category)
  };
});

// Define search history relations
export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.firebaseId],
  }),
}));

// User search preferences table
export const searchPreferences = pgTable("search_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId).unique(),
  favoriteCategories: text("favorite_categories").array().notNull().default([]),
  favoriteLocations: jsonb("favorite_locations").notNull().default([]), 
  lastLocation: jsonb("last_location"),
  radius: integer("radius").notNull().default(5), // Default search radius in km
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    userIdIdx: index("search_preferences_user_id_idx").on(table.userId)
  };
});

// Define search preferences relations
export const searchPreferencesRelations = relations(searchPreferences, ({ one }) => ({
  user: one(users, {
    fields: [searchPreferences.userId],
    references: [users.firebaseId],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertFriendSchema = createInsertSchema(friends).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertActivityParticipantSchema = createInsertSchema(activityParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  readAt: true,
  deliveredAt: true,
  updatedAt: true,
});

export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
});

export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export const insertBluetoothDeviceSchema = createInsertSchema(bluetoothDevices).omit({
  id: true,
  lastSeen: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  timestamp: true,
});

export const insertSearchPreferencesSchema = createInsertSchema(searchPreferences).omit({
  id: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertActivityParticipant = z.infer<typeof insertActivityParticipantSchema>;
export type ActivityParticipant = typeof activityParticipants.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;
export type ChatThread = typeof chatThreads.$inferSelect;

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;

export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;

export type InsertBluetoothDevice = z.infer<typeof insertBluetoothDeviceSchema>;
export type BluetoothDevice = typeof bluetoothDevices.$inferSelect;

export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;

export type InsertSearchPreferences = z.infer<typeof insertSearchPreferencesSchema>;
export type SearchPreferences = typeof searchPreferences.$inferSelect;
