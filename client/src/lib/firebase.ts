import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  User as FirebaseUser,
  Auth
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
  onSnapshot,
  Firestore
} from "firebase/firestore";
import { DEVELOPMENT_MODE } from './constants';

// Import Firebase instances from our configuration file
import { app, auth, db } from './firebaseConfig';

// Auth providers
const googleProvider = new GoogleAuthProvider();

// Add additional scopes for Google OAuth
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Log in a user with email and password
 * @param email User's email address
 * @param password User's password
 * @returns Firebase auth result
 */
export const loginWithEmail = async (email: string, password: string) => {
  // Log authentication attempt (email masked for privacy in logs)
  const maskedEmail = email.replace(/^(.{2})(.*)@(.{2})(.*)$/, '$1***@$3***');
  console.log('Attempting Firebase authentication with email:', maskedEmail);
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('Firebase authentication successful');
    
    // Update user's last login
    const userRef = doc(db, "users", result.user.uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      status: 'online'
    }).catch(error => {
      // Non-blocking error - just log it
      console.warn('Could not update last login time:', error);
    });
    
    return result;
  } catch (error: any) {
    console.error('Firebase authentication error:', error.code);
    
    // Enhanced error handling for security
    if (error.code === 'auth/too-many-requests') {
      // Add additional security measures for multiple failed attempts
      console.warn('Multiple failed login attempts detected');
    }
    
    throw error;
  }
};

/**
 * Register a new user with email and password
 * @param email User's email address
 * @param password User's password
 * @returns Firebase auth result
 */
export const signupWithEmail = async (email: string, password: string) => {
  const maskedEmail = email.replace(/^(.{2})(.*)@(.{2})(.*)$/, '$1***@$3***');
  console.log('Creating new account with email:', maskedEmail);
  
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Account created successfully');
    return result;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

/**
 * Sign in with Google (using popup in production, mock in development)
 * @returns Firebase auth result
 */
export const loginWithGoogle = async () => {
  console.log('Attempting Google authentication');
  
  if (DEVELOPMENT_MODE) {
    console.log('Development mode: skipping actual Google authentication');
    // In development mode, we'll just simulate a successful login
    // The actual login will be handled by the dev mode user in AuthContext
    return { user: { uid: 'dev-user-google' } } as any;
  }
  
  try {
    // First check if we have a redirect result
    const redirectResult = await getRedirectResult(auth).catch(err => null);
    if (redirectResult?.user) {
      console.log('Google redirect authentication successful');
      return redirectResult;
    }
    
    // If no redirect result, show popup
    // On mobile, consider using signInWithRedirect instead
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use redirect for mobile
      await signInWithRedirect(auth, googleProvider);
      // This function will return before the redirect completes
      // The result will be handled when the page loads again via getRedirectResult above
      return {} as any;
    } else {
      // Use popup for desktop
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google popup authentication successful');
      return result;
    }
  } catch (error: any) {
    console.error('Google authentication error:', error.code);
    
    // Special handling for common errors
    if (error.code === 'auth/popup-closed-by-user') {
      // This is a user action, not an error
      console.log('User closed the Google login popup');
    } else if (error.code === 'auth/popup-blocked') {
      // Try redirect as fallback if popup is blocked
      console.log('Popup blocked, attempting redirect method');
      await signInWithRedirect(auth, googleProvider);
      return {} as any;
    }
    
    throw error;
  }
};

/**
 * Update the current user's profile information
 * @param displayName New display name
 * @param photoURL New photo URL (optional)
 * @returns Promise that resolves when the profile is updated
 */
export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  if (!auth.currentUser) return Promise.reject(new Error("No user logged in"));
  
  try {
    await updateProfile(auth.currentUser, {
      displayName,
      photoURL: photoURL || auth.currentUser.photoURL
    });
    
    // Also update the user document in Firestore
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, {
      displayName,
      photoURL: photoURL || auth.currentUser.photoURL,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

/**
 * Log out the current user
 * @returns Promise that resolves when logout is complete
 */
export const logoutUser = async () => {
  if (!auth.currentUser) return Promise.resolve();
  
  try {
    // Update user status to offline before logging out
    if (!DEVELOPMENT_MODE) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      }).catch(err => console.warn('Could not update offline status before logout', err));
    }
    
    // Sign out
    return await signOut(auth);
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};

/**
 * Send a password reset email to the specified address
 * @param email The email address to send the reset link to
 * @returns Promise that resolves when the email is sent
 */
export const sendResetPasswordEmail = async (email: string) => {
  console.log('Sending password reset email to:', email.replace(/^(.{2})(.*)@(.{2})(.*)$/, '$1***@$3***'));
  
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Create or update a user document in Firestore
 * @param userId The user's Firebase UID
 * @param userData Basic user data to store/update
 * @returns Reference to the user document
 */
export const createUserDocument = async (userId: string, userData: any) => {
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  
  try {
    if (!snapshot.exists()) {
      // Document doesn't exist - create it
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        status: 'online',
        interests: [],
        // Add default privacy settings
        privacy: {
          shareLocation: false,
          showOnMap: true,
          allowMessages: true
        }
      });
      console.log('User document created for:', userId);
    } else {
      // Document exists - update last seen
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        status: 'online'
      });
    }
    
    return userRef;
  } catch (error) {
    console.error("Error managing user document:", error);
    // Still return the reference even if operation failed
    return userRef;
  }
};

/**
 * Update a user's location in Firestore
 * @param userId The user's Firebase UID
 * @param location Object containing latitude and longitude
 */
export const updateUserLocation = async (userId: string, location: { latitude: number, longitude: number }) => {
  const userRef = doc(db, "users", userId);
  
  try {
    await updateDoc(userRef, {
      location,
      lastSeen: serverTimestamp()
    });
    console.log('Updated location for user:', userId);
  } catch (error) {
    console.error("Error updating user location:", error);
    throw error;
  }
};

/**
 * Update a user's online status in Firestore
 * @param userId The user's Firebase UID
 * @param status New status ('online', 'busy', or 'offline')
 */
export const updateUserStatus = async (userId: string, status: 'online' | 'busy' | 'offline') => {
  const userRef = doc(db, "users", userId);
  
  try {
    await updateDoc(userRef, {
      status,
      lastSeen: serverTimestamp()
    });
    console.log('Updated status for user:', userId, 'to', status);
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
};

// Collection references - export these for easy access throughout the app
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
