import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";
import { app } from './firebaseConfig';
import { DEVELOPMENT_MODE } from './constants';

// Use the site key from environment variables if available, or fall back to default
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LfB1w4rAAAAAE3jDWJtl0rETiW2j0MRS7yxPdFK';

// Singleton instance to ensure we only initialize once
let appCheckInstance: AppCheck | null = null;

// Initialize Firebase App Check
export function initializeFirebaseAppCheck(): AppCheck | null {
  // If we already initialized, return the instance
  if (appCheckInstance) {
    return appCheckInstance;
  }
  
  // In development mode, use debug token
  if (DEVELOPMENT_MODE) {
    try {
      // Enable debug token for development
      console.log('Initializing Firebase App Check in debug mode');
      // @ts-ignore - This is a valid property in firebase/app-check
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      
      // Initialize App Check with reCAPTCHA v3
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      
      console.log('Firebase App Check initialized in development mode');
      return appCheckInstance;
    } catch (error) {
      console.error('Error initializing Firebase App Check in development mode:', error);
      // Don't throw - just return null
      return null;
    }
  } 
  
  // Production mode
  try {
    console.log('Initializing Firebase App Check in production mode');
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    
    console.log('Firebase App Check initialized in production mode');
    return appCheckInstance;
  } catch (error) {
    console.error('Error initializing Firebase App Check in production mode:', error);
    // In production we still want to attempt using Firebase, even without App Check
    return null;
  }
}