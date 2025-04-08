# Firebase Authentication Setup for Comemingel

This guide explains how to properly configure Firebase Authentication for production deployment.

## Prerequisites

1. A Firebase project created at [firebase.google.com](https://console.firebase.google.com/)
2. Owner or Editor access to the Firebase project

## Configuration Steps

### 1. Enable Authentication Methods

1. Go to the Firebase console > Authentication > Sign-in method
2. Enable the following authentication methods:
   - Email/Password
   - Google
   - (Optional) Facebook
   - (Optional) Apple

### 2. Add Authorized Domains

1. Go to the Firebase console > Authentication > Settings > Authorized domains
2. Add the following domains:
   - comemingel.com
   - www.comemingel.com
   - your-replit-app-domain.replit.app

### 3. Set Up Firebase App Check

1. Go to the Firebase console > App Check
2. Add a new web app if not already done
3. Choose reCAPTCHA v3 as the provider
4. Register the same domains as in step 2
5. Copy the site key and secret

### 4. Update Environment Variables

Update the following environment variables in your Replit project:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 5. Switch to Production Mode

In `client/src/lib/constants.ts`, set:

```typescript
export const DEVELOPMENT_MODE = false;
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Check if your VITE_FIREBASE_API_KEY is correct
2. **Unauthorized Domain**: Make sure your domain is added to the authorized domains list
3. **App Check Failure**: Ensure App Check is properly configured with correct domains
4. **Popup Blocked**: If using Google/social login, check if popups are allowed in the browser

### Testing Authentication

1. Clear local storage and cookies before testing
2. Use the browser console to check for authentication errors
3. Verify App Check is working by checking the network tab for 'app-check' requests

## Security Best Practices

1. Set up proper Firebase security rules
2. Use App Check to prevent abuse
3. Implement rate limiting for login attempts
4. Keep Firebase SDK updated to the latest version