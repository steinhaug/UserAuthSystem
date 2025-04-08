import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

// Friends table
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  friendId: text("friend_id").notNull(),
  status: text("status").notNull(), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

// Activities table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  creatorId: text("creator_id").notNull(),
  location: jsonb("location").notNull(),
  locationName: text("location_name").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  maxParticipants: integer("max_participants").notNull(),
  category: text("category").notNull(), // sports, social, food_drinks, games, other
  status: text("status").notNull(), // upcoming, active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity participants table
export const activityParticipants = pgTable("activity_participants", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  userId: text("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  type: text("type").default("text"), // text, system, friend_request
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat threads table
export const chatThreads = pgTable("chat_threads", {
  id: serial("id").primaryKey(),
  participants: text("participants").array().notNull(),
  lastMessageId: integer("last_message_id"),
  isBluetoothChat: boolean("is_bluetooth_chat").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// User challenges table
export const userChallenges = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bluetooth devices table
export const bluetoothDevices = pgTable("bluetooth_devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  userId: text("user_id").notNull(),
  name: text("name"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

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
