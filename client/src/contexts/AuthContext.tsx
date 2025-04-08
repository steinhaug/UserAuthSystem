import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, createUserDocument, logoutUser as firebaseLogout } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { DEVELOPMENT_MODE } from '@/lib/constants';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to handle logout
  const logout = async (): Promise<void> => {
    if (DEVELOPMENT_MODE) {
      // In development mode, just reset the states
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.setItem('devModeLoggedIn', 'false');
      return;
    } else {
      // In normal mode, use Firebase logout
      return firebaseLogout();
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
      // Always set the development mode login to true by default
      localStorage.setItem('devModeLoggedIn', 'true');

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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
