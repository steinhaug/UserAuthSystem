// Global constants for the application

// Development mode flag - set to true to use mock authentication
// Firebase App Check is preventing normal authentication, so we need to use dev mode
export const DEVELOPMENT_MODE = true;

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