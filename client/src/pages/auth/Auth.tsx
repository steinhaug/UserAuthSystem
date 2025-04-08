import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Login from './Login';
import Signup from './Signup';
import { useAuth } from '@/contexts/AuthContext';
import { app as firebaseApp } from '@/lib/firebase';
import { DEVELOPMENT_MODE } from '@/lib/constants';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to map if already authenticated
    if (isAuthenticated && !isLoading) {
      setLocation('/map');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // If still loading or already authenticated, don't render the form
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
        {DEVELOPMENT_MODE && (
          <p className="mt-4 text-gray-700 font-medium">
            Using development mode with mock authentication
          </p>
        )}
      </div>
    );
  }

  // Check if Firebase is properly configured
  const isFirebaseConfigured = firebaseApp && 
    import.meta.env.VITE_FIREBASE_API_KEY && 
    import.meta.env.VITE_FIREBASE_PROJECT_ID && 
    import.meta.env.VITE_FIREBASE_APP_ID;

  // If Firebase is not configured, show an error message
  if (!firebaseApp || !isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">Firebase Configuration Error</h2>
          </div>
          <p className="text-gray-700 mb-4">
            The Firebase credentials are missing or invalid. Please check the following:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-2 text-gray-700">
            <li className={import.meta.env.VITE_FIREBASE_API_KEY ? "text-green-600" : "text-red-600"}>
              {import.meta.env.VITE_FIREBASE_API_KEY ? "✓" : "✗"} Firebase API Key
            </li>
            <li className={import.meta.env.VITE_FIREBASE_PROJECT_ID ? "text-green-600" : "text-red-600"}>
              {import.meta.env.VITE_FIREBASE_PROJECT_ID ? "✓" : "✗"} Firebase Project ID
            </li>
            <li className={import.meta.env.VITE_FIREBASE_APP_ID ? "text-green-600" : "text-red-600"}>
              {import.meta.env.VITE_FIREBASE_APP_ID ? "✓" : "✗"} Firebase App ID
            </li>
          </ul>
          <p className="text-sm text-gray-600 mb-4">
            Please ensure all Firebase credentials are correctly set in your environment variables. 
            These can be found in your Firebase console under Project Settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container relative h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80")',
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}>
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-heading text-white mb-2">Comemingel</h1>
          <p className="text-white text-lg">Connect with people nearby</p>
        </div>
        
        {/* Auth Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button 
              className={`w-1/2 py-4 text-center font-medium ${activeTab === 'login' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
            <button 
              className={`w-1/2 py-4 text-center font-medium ${activeTab === 'signup' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
              onClick={() => setActiveTab('signup')}
            >
              Sign Up
            </button>
          </div>
          
          {activeTab === 'login' ? <Login /> : <Signup />}
        </div>
      </div>
    </div>
  );
}
