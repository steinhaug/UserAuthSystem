import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContextualHints } from '@/hooks/use-contextual-hints';

export type MicroInteractionContextType = {
  // Points related
  awardPoints: (points: number, reason: string) => void;
  getUserPoints: () => number;
  
  // Contextual hints
  triggerHint: (hintId: string) => boolean;
  dismissHint: (hintId: string) => void;
  markHintEligible: (hintId: string, value?: boolean) => void;
};

const MicroInteractionsContext = createContext<MicroInteractionContextType | null>(null);

export const MicroInteractionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [userPoints, setUserPoints] = useState<number>(0);
  const { activeHints, dismissHint, triggerHint, markHintEligible } = useContextualHints();
  
  // Load user points from localStorage
  useEffect(() => {
    const storedPoints = localStorage.getItem('userPoints');
    if (storedPoints) {
      setUserPoints(parseInt(storedPoints, 10));
    } else {
      // Initialize with 0 points
      localStorage.setItem('userPoints', '0');
    }
  }, []);
  
  // Update points when user changes
  useEffect(() => {
    if (userProfile?.firebaseId) {
      // In a real app, we'd fetch this from the server
      const storedPoints = localStorage.getItem(`userPoints_${userProfile.firebaseId}`);
      if (storedPoints) {
        setUserPoints(parseInt(storedPoints, 10));
      }
    }
  }, [userProfile?.firebaseId]);
  
  // Award points to the user
  const awardPoints = (points: number, reason: string) => {
    const newTotal = userPoints + points;
    setUserPoints(newTotal);
    
    // Save to localStorage
    localStorage.setItem('userPoints', newTotal.toString());
    
    if (userProfile?.firebaseId) {
      localStorage.setItem(`userPoints_${userProfile.firebaseId}`, newTotal.toString());
    }
    
    // Only show toast for significant point awards (10+ points)
    if (points >= 10) {
      toast({
        title: `+${points} poeng!`,
        description: reason,
        variant: 'default',
        className: 'points-reward-toast',
      });
    }
  };
  
  // Get current user points
  const getUserPoints = () => userPoints;
  
  const value = {
    // Points
    awardPoints,
    getUserPoints,
    
    // Hints
    triggerHint,
    dismissHint,
    markHintEligible,
  };
  
  return (
    <MicroInteractionsContext.Provider value={value}>
      {children}
    </MicroInteractionsContext.Provider>
  );
};

export const useMicroInteractions = () => {
  const context = useContext(MicroInteractionsContext);
  
  if (!context) {
    throw new Error('useMicroInteractions must be used within MicroInteractionsProvider');
  }
  
  return context;
};