import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Resolve .env file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const envPath = path.resolve(rootDir, '.env');

// Load environment variables
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env file found, using process.env');
  dotenv.config();
}

async function testFirebase() {
  console.log('\x1b[36m=== Testing Firebase Configuration ===\x1b[0m');
  
  // Check required Firebase environment variables
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('\x1b[31mERROR: Missing required Firebase environment variables:\x1b[0m');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
  }
  
  // Configure Firebase
  try {
    console.log('Initializing Firebase app...');
    
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      appId: process.env.VITE_FIREBASE_APP_ID,
    };
    
    const app = initializeApp(firebaseConfig);
    console.log('\x1b[32m✓ Firebase app initialized successfully\x1b[0m');
    
    // Test Auth
    console.log('\nInitializing Firebase Auth...');
    const auth = getAuth(app);
    console.log('\x1b[32m✓ Firebase Auth initialized successfully\x1b[0m');
    
    // Test AppCheck (if desired)
    if (process.env.ENABLE_APPCHECK === 'true') {
      console.log('\nInitializing Firebase AppCheck...');
      try {
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider('recaptcha-v3-site-key'),
          isTokenAutoRefreshEnabled: true
        });
        console.log('\x1b[32m✓ Firebase AppCheck initialized successfully\x1b[0m');
      } catch (error) {
        console.log('\x1b[33m⚠ Firebase AppCheck initialization skipped (requires reCAPTCHA key)\x1b[0m');
      }
    }
    
    console.log('\n\x1b[32m✓ Firebase configuration test completed successfully!\x1b[0m');
    console.log('\x1b[33mNote: This only verifies configuration, not actual authentication.\x1b[0m');
    console.log('\x1b[33mTo test authentication, you would need to attempt a sign-in operation.\x1b[0m');
    
  } catch (error) {
    console.error('\x1b[31mERROR: Failed to initialize Firebase\x1b[0m');
    console.error(error);
    process.exit(1);
  }
}

testFirebase().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});