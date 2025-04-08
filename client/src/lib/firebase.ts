import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
}
  
  from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

// Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined
};

// Verify Firebase config is valid
const isValidConfig = 
  !!firebaseConfig.apiKey && 
  !!firebaseConfig.projectId && 
  !!firebaseConfig.appId;

if (!isValidConfig) {
  console.error('Firebase configuration is invalid:', 
    JSON.stringify({
      apiKey: !!firebaseConfig.apiKey,
      projectId: !!firebaseConfig.projectId,
      appId: !!firebaseConfig.appId
    })
  );
}

// Initialize Firebase only if it hasn't been initialized already
let app;
// Check if Firebase has been initialized
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const loginWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signupWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const updateUserProfile = (displayName: string, photoURL?: string) => {
  if (!auth.currentUser) return Promise.reject("No user logged in");
  return updateProfile(auth.currentUser, {
    displayName,
    photoURL
  });
};

export const logoutUser = () => {
  return signOut(auth);
};

// Firestore helpers
export const createUserDocument = async (userId: string, userData: any) => {
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  
  if (!snapshot.exists()) {
    try {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        status: 'online'
      });
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  }
  
  return userRef;
};

export const updateUserLocation = async (userId: string, location: { latitude: number, longitude: number }) => {
  const userRef = doc(db, "users", userId);
  try {
    await updateDoc(userRef, {
      location,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user location:", error);
  }
};

export const updateUserStatus = async (userId: string, status: 'online' | 'busy' | 'offline') => {
  const userRef = doc(db, "users", userId);
  try {
    await updateDoc(userRef, {
      status,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user status:", error);
  }
};

// Collection references
export const usersCollection = collection(db, "users");
export const friendsCollection = collection(db, "friends");
export const activitiesCollection = collection(db, "activities");
export const activityParticipantsCollection = collection(db, "activity_participants");
export const chatThreadsCollection = collection(db, "chat_threads");
export const chatMessagesCollection = collection(db, "chat_messages");
export const challengesCollection = collection(db, "challenges");
export const userChallengesCollection = collection(db, "user_challenges");

// Export the firebase instances
export { app, auth, db };
