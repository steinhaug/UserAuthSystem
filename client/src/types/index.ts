// User-related types
export interface User {
  id: string;
  firebaseId: string; // Firebase user ID used for authentication
  displayName: string;
  username: string; // Unique username for the user
  email: string;
  photoURL: string;
  status: 'online' | 'busy' | 'offline';
  location?: GeoPoint;
  interests: string[];
  createdAt: number;
  lastSeen: number;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

// Location types
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Activity types
export interface Activity {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  location: GeoPoint;
  locationName: string;
  startTime: number;
  endTime: number;
  maxParticipants: number;
  category: ActivityCategory;
  status: ActivityStatus;
  createdAt: number;
}

export type ActivityCategory = 'sports' | 'social' | 'food_drinks' | 'games' | 'other';
export type ActivityStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface ActivityParticipant {
  id: string;
  activityId: string;
  userId: string;
  joinedAt: number;
}

// Chat types
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: number;
  type: 'text' | 'system' | 'friend_request' | 'image' | 'video' | 'audio';
  mediaURL?: string; // URL to media file for image/video/audio messages
  mediaThumbnailURL?: string; // Thumbnail URL for image/video messages
  mediaDuration?: number; // Duration in seconds for audio/video
  mediaSize?: number; // Size in bytes
  status?: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
}

export interface ChatThread {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  isBluetoothChat: boolean;
  createdAt: number;
  updatedAt: number;
}

// Challenge types
export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  target: number;
  type: ChallengeType;
  startTime: number;
  endTime: number;
}

export type ChallengeType = 'chat_new' | 'visit_hotspot' | 'create_activity' | 'join_activity' | 'add_friends';

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
}

// Bluetooth types
export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number; // Signal strength
  user?: User; // If matched with a Comemingel user
  lastSeen: number;
}
