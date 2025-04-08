import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { DEVELOPMENT_MODE } from './constants';
import { initializeFirebaseAppCheck } from './appCheck';

// Firebase configuration with values provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyCthI0fdJzNGxKRqHk2dB1fis3aG23CE-Y",
  authDomain: "comemingel.firebaseapp.com",
  databaseURL: "https://comemingel-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "comemingel",
  storageBucket: "comemingel.firebasestorage.app",
  messagingSenderId: "950680129178",
  appId: "1:950680129178:web:f99dc85b4168b8b431d923",
  measurementId: "G-DQT4KTDJMT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase App Check (for production only)
if (!DEVELOPMENT_MODE) {
  try {
    initializeFirebaseAppCheck();
  } catch (error) {
    console.error("Error initializing Firebase App Check:", error);
    console.warn("Falling back to development mode due to App Check initialization failure");
  }
}

// Log initialization status
if (DEVELOPMENT_MODE) {
  console.log("Firebase initialized in DEVELOPMENT mode (mock authentication)");
} else {
  console.log("Firebase initialized with project:", firebaseConfig.projectId);
}

export { app, auth, db };