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
  type InsertBluetoothDevice
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
  
  // Challenge methods
  getChallenges(): Promise<Challenge[]>;
  getUserChallenges(userId: string): Promise<UserChallenge[]>;
  acceptChallenge(challengeId: string, userId: string): Promise<UserChallenge>;
  updateChallengeProgress(challengeId: string, userId: string, progress: number): Promise<UserChallenge | undefined>;
  
  // Bluetooth methods
  registerBluetoothDevice(device: InsertBluetoothDevice): Promise<BluetoothDevice>;
  getBluetoothDevicesByUserId(userId: string): Promise<BluetoothDevice[]>;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private friendsData: Map<string, Friend>;
  private activitiesData: Map<string, Activity>;
  private activityParticipantsData: Map<string, ActivityParticipant>;
  private chatThreadsData: Map<string, ChatThread>;
  private chatMessagesData: Map<string, ChatMessage>;
  private challengesData: Map<string, Challenge>;
  private userChallengesData: Map<string, UserChallenge>;
  private bluetoothDevicesData: Map<string, BluetoothDevice>;
  
  currentUserId: number;
  currentFriendId: number;
  currentActivityId: number;
  currentParticipantId: number;
  currentChatThreadId: number;
  currentChatMessageId: number;
  currentChallengeId: number;
  currentUserChallengeId: number;
  currentBluetoothDeviceId: number;

  constructor() {
    this.usersData = new Map();
    this.friendsData = new Map();
    this.activitiesData = new Map();
    this.activityParticipantsData = new Map();
    this.chatThreadsData = new Map();
    this.chatMessagesData = new Map();
    this.challengesData = new Map();
    this.userChallengesData = new Map();
    this.bluetoothDevicesData = new Map();
    
    this.currentUserId = 1;
    this.currentFriendId = 1;
    this.currentActivityId = 1;
    this.currentParticipantId = 1;
    this.currentChatThreadId = 1;
    this.currentChatMessageId = 1;
    this.currentChallengeId = 1;
    this.currentUserChallengeId = 1;
    this.currentBluetoothDeviceId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.firebaseId === firebaseId
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now,
      lastSeen: now
    };
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(firebaseId: string, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUserByFirebaseId(firebaseId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData, lastSeen: new Date() };
    this.usersData.set(user.id, updatedUser);
    return updatedUser;
  }

  async updateUserLocation(firebaseId: string, location: { latitude: number, longitude: number }): Promise<void> {
    const user = await this.getUserByFirebaseId(firebaseId);
    if (!user) return;
    
    const updatedUser = { ...user, location, lastSeen: new Date() };
    this.usersData.set(user.id, updatedUser);
  }

  // Friend methods
  async getFriendsByUserId(userId: string): Promise<Friend[]> {
    return Array.from(this.friendsData.values()).filter(
      (friend) => friend.userId === userId || friend.friendId === userId
    );
  }

  async createFriendRequest(userId: string, friendId: string): Promise<Friend> {
    const id = this.currentFriendId++;
    const friend: Friend = {
      id,
      userId,
      friendId,
      status: 'pending',
      createdAt: new Date()
    };
    this.friendsData.set(id.toString(), friend);
    return friend;
  }

  async updateFriendRequest(requestId: string, status: string): Promise<Friend | undefined> {
    const friendRequest = this.friendsData.get(requestId);
    if (!friendRequest) return undefined;
    
    const updatedRequest = { ...friendRequest, status };
    this.friendsData.set(requestId, updatedRequest);
    return updatedRequest;
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activitiesData.values());
  }

  async getActivityById(id: string): Promise<Activity | undefined> {
    return this.activitiesData.get(id);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const newActivity: Activity = {
      ...activity,
      id,
      createdAt: new Date()
    };
    this.activitiesData.set(id.toString(), newActivity);
    return newActivity;
  }

  async joinActivity(activityId: string, userId: string): Promise<ActivityParticipant> {
    const id = this.currentParticipantId++;
    const participant: ActivityParticipant = {
      id,
      activityId: parseInt(activityId),
      userId,
      joinedAt: new Date()
    };
    this.activityParticipantsData.set(id.toString(), participant);
    return participant;
  }

  // Chat methods
  async getChatThreadsByUserId(userId: string): Promise<ChatThread[]> {
    return Array.from(this.chatThreadsData.values()).filter(
      (thread) => thread.participants.includes(userId)
    );
  }

  async getChatMessagesByThreadId(threadId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessagesData.values()).filter(
      (message) => message.threadId === threadId
    );
  }

  async createChatThread(thread: InsertChatThread): Promise<ChatThread> {
    const id = this.currentChatThreadId++;
    const now = new Date();
    const newThread: ChatThread = {
      ...thread,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.chatThreadsData.set(id.toString(), newThread);
    return newThread;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const newMessage: ChatMessage = {
      ...message,
      id,
      createdAt: new Date()
    };
    this.chatMessagesData.set(id.toString(), newMessage);
    return newMessage;
  }

  // Challenge methods
  async getChallenges(): Promise<Challenge[]> {
    return Array.from(this.challengesData.values());
  }

  async getUserChallenges(userId: string): Promise<UserChallenge[]> {
    return Array.from(this.userChallengesData.values()).filter(
      (challenge) => challenge.userId === userId
    );
  }

  async acceptChallenge(challengeId: string, userId: string): Promise<UserChallenge> {
    const id = this.currentUserChallengeId++;
    const userChallenge: UserChallenge = {
      id,
      userId,
      challengeId: parseInt(challengeId),
      progress: 0,
      completed: false,
      createdAt: new Date()
    };
    this.userChallengesData.set(id.toString(), userChallenge);
    return userChallenge;
  }

  async updateChallengeProgress(challengeId: string, userId: string, progress: number): Promise<UserChallenge | undefined> {
    // Find the user challenge
    const userChallenge = Array.from(this.userChallengesData.values()).find(
      (challenge) => challenge.challengeId === parseInt(challengeId) && challenge.userId === userId
    );
    
    if (!userChallenge) return undefined;
    
    // Get the challenge to check if the progress meets the target
    const challenge = this.challengesData.get(challengeId);
    
    // Update progress
    const completed = challenge ? progress >= challenge.target : false;
    const completedAt = completed ? new Date() : undefined;
    
    const updatedChallenge: UserChallenge = {
      ...userChallenge,
      progress,
      completed,
      completedAt
    };
    
    this.userChallengesData.set(userChallenge.id.toString(), updatedChallenge);
    return updatedChallenge;
  }

  // Bluetooth methods
  async registerBluetoothDevice(device: InsertBluetoothDevice): Promise<BluetoothDevice> {
    const id = this.currentBluetoothDeviceId++;
    const newDevice: BluetoothDevice = {
      ...device,
      id,
      lastSeen: new Date()
    };
    this.bluetoothDevicesData.set(id.toString(), newDevice);
    return newDevice;
  }

  async getBluetoothDevicesByUserId(userId: string): Promise<BluetoothDevice[]> {
    return Array.from(this.bluetoothDevicesData.values()).filter(
      (device) => device.userId === userId
    );
  }
}

export const storage = new MemStorage();
