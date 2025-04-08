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
import { DEVELOPMENT_MODE } from '@/lib/constants';

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
    if (DEVELOPMENT_MODE) {
      // In development mode, just reset the states
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.setItem('devModeLoggedIn', 'false');
      
      // Redirect to login page after logout
      window.location.href = '/login';
      return;
    } else {
      // In normal mode, use Firebase logout
      await firebaseLogout();
      window.location.href = '/login';
      return;
    }
  };

  // Check if we should load the dev user
  const shouldLoadDevUser = () => {
    if (!DEVELOPMENT_MODE) return false;
    const devLoggedIn = localStorage.getItem('devModeLoggedIn');
    console.log("Development mode login status:", devLoggedIn);
    return devLoggedIn === 'true';
  };

  useEffect(() => {
    if (DEVELOPMENT_MODE) {
      // Check if we should auto-login in development mode
      // Don't automatically set devModeLoggedIn to true, let the login form handle this
      
      if (shouldLoadDevUser()) {
        // In development mode, create a mock user
        console.log("🔧 Using development mode with mock user");
        
        // Create a fake user for development
        const mockUser = {
          uid: "dev-user-1",
          displayName: "Dev User",
          email: "dev@example.com",
          photoURL: null,
        } as unknown as FirebaseUser;
        
        setCurrentUser(mockUser);
        
        // Create a mock user profile
        const mockProfile: User = {
          id: mockUser.uid,
          firebaseId: mockUser.uid,
          displayName: mockUser.displayName || "Dev User",
          username: "devuser",
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
        // Not logged in for dev mode
        setCurrentUser(null);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }
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
