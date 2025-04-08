// Set this to false when deploying to production
export const DEVELOPMENT_MODE = true;

// Firebase configuration constants
export const FIREBASE_AUTH_PERSISTENCE = true;
export const AUTH_STATE_CHANGE_DELAY = 1000;

// WebSocket constants
export const WS_RECONNECT_INTERVAL = 3000; // 3 seconds
export const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 5;

// Location constants
export const LOCATION_UPDATE_INTERVAL = 60000; // 1 minute
export const NEARBY_USER_RADIUS_METERS = 1000; // 1 km