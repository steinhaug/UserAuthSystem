import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { app } from './firebaseConfig';
import { DEVELOPMENT_MODE } from './constants';

// The reCAPTCHA site key provided
const RECAPTCHA_SITE_KEY = '6LfB1w4rAAAAAE3jDWJtl0rETiW2j0MRS7yxPdFK';

// Initialize Firebase App Check
export function initializeFirebaseAppCheck() {
  // Only use App Check in production mode
  if (!DEVELOPMENT_MODE) {
    try {
      // Enable debug mode for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('Initializing Firebase App Check in debug mode');
        // @ts-ignore - This is a valid property in firebase/app-check
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      
      // Initialize App Check with reCAPTCHA v3
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      
      console.log('Firebase App Check initialized');
      return appCheck;
    } catch (error) {
      console.error('Error initializing Firebase App Check:', error);
      throw error;
    }
  } else {
    console.log('Firebase App Check disabled in development mode');
    return null;
  }
}