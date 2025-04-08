import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK 
// This can use environment variables or a service account key file
let app: any;
let auth: any;
let firestore: any;

try {
  // Attempt to initialize using environment variables or service account
  // This will work in production when properly configured
  app = initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    // If using a service account key file uncomment the following lines
    // credential: cert({
    //   projectId: process.env.FIREBASE_PROJECT_ID,
    //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    // } as ServiceAccount),
  });
  
  // Get Firebase Admin services
  auth = getAuth(app);
  firestore = getFirestore(app);
  
  console.log("Firebase Admin initialized successfully");
  
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
  
  // Create placeholder admin app for development mode
  app = {} as any;
  auth = {
    verifyIdToken: async () => ({ uid: 'dev-user-1' }),
    getUser: async () => ({
      uid: 'dev-user-1',
      email: 'dev@example.com',
      displayName: 'Dev User',
    }),
  };
  firestore = {};
  
  console.log("Using Firebase Admin mock services for development");
}

// Export services
export { app, auth, firestore };