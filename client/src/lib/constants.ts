// Global constants for the application

// Development mode flag - set to false to use real Firebase authentication with direct config
export const DEVELOPMENT_MODE = false;

// API endpoints
export const API_ENDPOINTS = {
  users: '/api/users',
  friends: '/api/friends',
  activities: '/api/activities',
  challenges: '/api/challenges',
  chat: '/api/chat',
};

// Local storage keys
export const STORAGE_KEYS = {
  authToken: 'comemingel_auth_token',
  userId: 'comemingel_user_id',
};