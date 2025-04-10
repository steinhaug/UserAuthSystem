import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { DEVELOPMENT_MODE } from './constants';
import { initializeFirebaseAppCheck } from './appCheck';

// Get Firebase configuration values from environment variables when possible
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCthI0fdJzNGxKRqHk2dB1fis3aG23CE-Y",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "comemingel"}.firebaseapp.com`,
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL || "https://comemingel-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "comemingel",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "comemingel"}.appspot.com`,
  messagingSenderId: "950680129178",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:950680129178:web:f99dc85b4168b8b431d923",
  measurementId: "G-DQT4KTDJMT"
};

// Initialize Firebase application
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Set auth persistence to local (survive page refresh)
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("Firebase auth persistence set to LOCAL"))
  .catch(error => console.error("Error setting auth persistence:", error));

// Connect to emulators in development
if (DEVELOPMENT_MODE && import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    // Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    // Firestore emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    // Realtime Database emulator
    connectDatabaseEmulator(rtdb, 'localhost', 9000);
    console.log("🔧 Connected to Firebase LOCAL emulators");
  } catch (error) {
    console.error("Failed to connect to Firebase emulators:", error);
  }
}

// Initialize Firebase App Check
try {
  initializeFirebaseAppCheck();
} catch (error) {
  console.error("Error initializing Firebase App Check:", error);
  console.warn("App will continue without App Check protection");
}

// Log initialization status
if (DEVELOPMENT_MODE) {
  console.log("Firebase initialized in DEVELOPMENT mode (mock authentication)");
} else {
  console.log("Firebase initialized with project:", firebaseConfig.projectId);
}

export { app, auth, db, rtdb };