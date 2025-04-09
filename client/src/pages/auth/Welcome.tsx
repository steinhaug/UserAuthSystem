import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useMicroInteractions } from '@/contexts/MicroInteractionsContext';
import { useAuth } from '@/contexts/AuthContext';

const Welcome: React.FC = () => {
  const [, navigate] = useLocation();
  const { triggerHint } = useMicroInteractions();
  const { isLoading, userProfile } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && userProfile) {
      navigate('/map');
    }
  }, [isLoading, userProfile, navigate]);

  // Trigger welcome hint when component mounts
  useEffect(() => {
    // Wait a bit before showing the hint
    const timer = setTimeout(() => {
      triggerHint('welcome-tour');
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [triggerHint]);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary">
        <div className="w-16 h-16 border-t-4 border-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 mx-4 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl
                 transform transition duration-300 hover:-translate-y-1 hover:scale-105"
      >
        <div className="flex flex-col items-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
            className="mb-6"
          >
            <svg width="100" height="100" viewBox="0 0 200 200" className="fill-primary">
              <path d="M100 20C55.8 20 20 55.8 20 100s35.8 80 80 80c28.4 0 53.8-14.7 68.3-37.1 2.5-3.8-0.5-8.9-5-8.9-1.9 0-3.7 0.9-4.8 2.5C146.9 155.3 124.8 168 100 168c-37.6 0-68-30.4-68-68s30.4-68 68-68c24.8 0 46.9 12.7 58.5 31.5 1.1 1.6 2.9 2.5 4.8 2.5 4.5 0 7.5-5.1 5-8.9C153.8 34.7 128.4 20 100 20zm90 80c0-3.9-3.1-7-7-7h-40c-3.9 0-7 3.1-7 7v40c0 3.9 3.1 7 7 7s7-3.1 7-7v-33h33c3.9 0 7-3.1 7-7z" />
            </svg>
          </motion.div>
          
          {/* App Name */}
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mb-8 text-5xl font-bold text-primary text-center"
          >
            ComeMingel
          </motion.h1>
          
          {/* Welcome Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full p-6 bg-slate-50/90 rounded-xl shadow-sm"
          >
            <h2 className="mb-2 text-3xl font-bold text-center text-slate-800">
              Welcome to ComeMingel
            </h2>
            <p className="mb-6 text-center text-slate-600 text-lg">
              Connect with people nearby in real time.
            </p>
            <Button 
              onClick={handleGetStarted}
              className="w-full py-4 text-lg font-bold bg-red-500 hover:bg-red-600 rounded-full shadow-md transform transition-all duration-200 hover:shadow-lg"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Welcome;