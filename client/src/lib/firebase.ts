import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
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

// Import Firebase instances from our configuration file
import { app, auth, db } from './firebaseConfig';

// Auth providers
const googleProvider = new GoogleAuthProvider();

// Add additional scopes for Google OAuth
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Authentication functions
export const loginWithEmail = async (email: string, password: string) => {
  try {
    console.log('Attempting Firebase authentication with email:', email);
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('Firebase authentication successful', result.user.uid);
    return result;
  } catch (error) {
    console.error('Firebase authentication error:', error);
    throw error;
  }
};

export const signupWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
  try {
    console.log('Attempting Google authentication');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google authentication successful', result.user.uid);
    return result;
  } catch (error) {
    console.error('Google authentication error:', error);
    throw error;
  }
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

export const sendResetPasswordEmail = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
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
