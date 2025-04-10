import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, getAuth } from 'firebase/auth';
import { 
  auth, 
  createUserDocument, 
  logoutUser as firebaseLogout, 
  sendResetPasswordEmail,
  updateUserProfile as firebaseUpdateProfile
} from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { DEVELOPMENT_MODE, USE_REAL_AUTH_IN_DEV } from '@/lib/constants';

// For development mode only - interface for mock user data
interface DevUserData {
  displayName: string;
  email: string;
  firebaseId: string;
  photoURL?: string;
}

// Session constants
const SESSION_STORAGE_KEY = 'comemingel_session';
const SESSION_EXPIRY_HOURS = 24; // Session expires after 24 hours

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDevMode: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  isAuthenticated: false,
  isLoading: true,
  isDevMode: DEVELOPMENT_MODE,
  logout: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to update the user profile
  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!currentUser) throw new Error("No user logged in");
    
    try {
      if (DEVELOPMENT_MODE) {
        // In dev mode, just update the local state
        if (userProfile) {
          const updatedProfile = { ...userProfile, ...data };
          setUserProfile(updatedProfile);
        }
        return;
      }
      
      // In production, update the Firebase user profile if display name is provided
      if (data.displayName) {
        await firebaseUpdateProfile(data.displayName, data.photoURL || "");
      }
      
      // Update user document in Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      // Fetch updated profile
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setUserProfile({ id: currentUser.uid, ...userDoc.data() } as User);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  // Function to handle password reset
  const resetPassword = async (email: string): Promise<void> => {
    try {
      if (DEVELOPMENT_MODE) {
        console.log("Password reset requested for:", email);
        return;
      }
      
      await sendResetPasswordEmail(email);
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  };

  // Function to handle logout
  const logout = async (): Promise<void> => {
    // If using real auth in dev mode or in production
    if (!DEVELOPMENT_MODE || USE_REAL_AUTH_IN_DEV) {
      try {
        // Use Firebase logout and clear any session data
        await firebaseLogout();
        
        // Clear any Firebase cached data
        if (window.indexedDB) {
          // Try to clear IndexedDB storage for Firebase Auth
          try {
            indexedDB.deleteDatabase('firebaseLocalStorageDb');
          } catch (err) {
            console.warn('Could not clear Firebase IndexedDB:', err);
          }
        }
        
        // Redirect to login page after logout
        window.location.href = '/auth';
      } catch (error) {
        console.error('Error during logout:', error);
        
        // Force a redirect even if logout fails
        window.location.href = '/auth';
      }
    } 
    // Using mock authentication in development mode
    else if (DEVELOPMENT_MODE && !USE_REAL_AUTH_IN_DEV) {
      // In development mode, clear all dev user data
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.setItem('devModeLoggedIn', 'false');
      localStorage.removeItem('devUserData'); // Also clear the stored user data
      
      // Show a message about dev mode logout
      console.log("Development mode: logged out mock user");
      
      // Redirect to login page after logout
      window.location.href = '/auth';
      return;
    }
  };

  // Check if we should load the dev user
  const shouldLoadDevUser = () => {
    // If using real auth is enabled, never use dev user
    if (USE_REAL_AUTH_IN_DEV || !DEVELOPMENT_MODE) return false;
    
    const devLoggedIn = localStorage.getItem('devModeLoggedIn');
    console.log("Development mode login status:", devLoggedIn);
    
    // Treat null (uninitialized) or 'true' as logged in for smoother experience in development mode
    return devLoggedIn === 'true' || devLoggedIn === null;
  };

  useEffect(() => {
    // If using real auth in dev mode, skip mock user
    if (DEVELOPMENT_MODE && !USE_REAL_AUTH_IN_DEV) {
      // Check if we should auto-login in development mode
      // Allow auto-login with null/undefined localStorage for better dev experience
      
      if (shouldLoadDevUser()) {
        // In development mode, create a mock user
        console.log("🔧 Using development mode with mock user");
        
        // Set localStorage to true for consistent state
        localStorage.setItem('devModeLoggedIn', 'true');
        
        // Try to get saved dev user data from localStorage (from signup/login)
        let storedDevUserData: DevUserData | null = null;
        try {
          const devUserDataString = localStorage.getItem('devUserData');
          if (devUserDataString) {
            storedDevUserData = JSON.parse(devUserDataString) as DevUserData;
            console.log("📝 Found stored dev user data:", storedDevUserData.displayName);
          }
        } catch (error) {
          console.warn("Could not parse stored dev user data", error);
        }
        
        // Create a fake user for development
        const mockUser = {
          uid: storedDevUserData?.firebaseId || "dev-user-1",
          displayName: storedDevUserData?.displayName || "Dev User",
          email: storedDevUserData?.email || "dev@example.com",
          photoURL: storedDevUserData?.photoURL || null,
        } as unknown as FirebaseUser;
        
        setCurrentUser(mockUser);
        
        // Create a mock user profile
        const mockProfile: User = {
          id: mockUser.uid,
          firebaseId: mockUser.uid,
          displayName: mockUser.displayName || "Dev User",
          username: storedDevUserData?.email?.split('@')[0] || "devuser",
          email: mockUser.email || "dev@example.com",
          photoURL: mockUser.photoURL || "",
          status: 'online',
          interests: ['development', 'testing'],
          createdAt: Date.now(),
          lastSeen: Date.now()
        };
        
        setUserProfile(mockProfile);
        setIsLoading(false);
        return;
      } else {
        // User explicitly logged out in dev mode
        console.log("Development mode: not logged in");
        setCurrentUser(null);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }
    }
    
    // If USE_REAL_AUTH_IN_DEV is true, we'll use real Firebase auth even in development mode
    if (DEVELOPMENT_MODE && USE_REAL_AUTH_IN_DEV) {
      console.log("Using real Firebase authentication in development mode");
    }
    
    // Listen for auth state changes (normal mode)
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Create user document if it doesn't exist
        await createUserDocument(user.uid, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
        
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile({ id: user.uid, ...userDoc.data() } as User);
        }
      } else {
        setUserProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userProfile,
    isAuthenticated: !!currentUser || (DEVELOPMENT_MODE && shouldLoadDevUser()),
    isLoading,
    isDevMode: DEVELOPMENT_MODE,
    logout,
    updateProfile,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
