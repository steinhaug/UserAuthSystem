import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { DEVELOPMENT_MODE } from './constants';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: "comemingel.firebaseapp.com",
  projectId: "comemingel",
  storageBucket: "comemingel.appspot.com",
  appId: "1:950680129178:web:f99dc85b4168b8b431d923"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Log initialization status
if (DEVELOPMENT_MODE) {
  console.log("Firebase initialized in DEVELOPMENT mode (mock authentication)");
} else {
  console.log("Firebase initialized with project:", firebaseConfig.projectId);
}

export { app, auth, db };