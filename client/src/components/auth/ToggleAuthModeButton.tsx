import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isDevelopment, setUseRealAuth, getUseRealAuth } from '@/lib/constants';

export default function ToggleAuthModeButton() {
  const [usingRealAuth, setUsingRealAuth] = useState(getUseRealAuth());
  const { toast } = useToast();

  // Only show in development mode
  if (!isDevelopment) {
    return null;
  }

  const toggleAuthMode = () => {
    const newValue = !usingRealAuth;
    setUseRealAuth(newValue);
    setUsingRealAuth(newValue);
    
    toast({
      title: newValue ? 'Using Real Firebase Auth' : 'Using Mock Authentication',
      description: newValue 
        ? 'Switched to real Firebase authentication.' 
        : 'Switched to mock authentication for development.',
      duration: 3000,
    });
    
    // Reload the page to apply the changes
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <Button 
      variant={usingRealAuth ? "default" : "outline"}
      size="sm"
      className={`fixed bottom-4 right-4 z-50 text-sm bg-background/80 backdrop-blur-sm border ${usingRealAuth ? 'border-primary' : 'border-border'} shadow-lg p-4 font-medium transform hover:scale-105 transition-all`}
      onClick={toggleAuthMode}
    >
      {usingRealAuth ? '🔒 Using Real Auth' : '🧪 Using Mock Auth'}
    </Button>
  );
}