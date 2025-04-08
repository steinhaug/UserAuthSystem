import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Login from './Login';
import Signup from './Signup';
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
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
