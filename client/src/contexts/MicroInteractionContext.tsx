import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types of micro-interactions we can display
export type MicroInteractionType = 
  | 'success' 
  | 'error' 
  | 'info' 
  | 'warning' 
  | 'achievement' 
  | 'hint' 
  | 'confetti';

// Positions for micro-interactions
export type MicroInteractionPosition = 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'center' 
  | 'inline';

export interface MicroInteraction {
  id: string;
  type: MicroInteractionType;
  message?: string;
  position?: MicroInteractionPosition;
  duration?: number; // in milliseconds
  element?: React.ReactNode;
  targetRef?: React.RefObject<HTMLElement>;
  data?: any;
}

interface MicroInteractionContextType {
  interactions: MicroInteraction[];
  addInteraction: (interaction: Omit<MicroInteraction, 'id'>) => string;
  removeInteraction: (id: string) => void;
  clearInteractions: () => void;
  // Utility functions for common interactions
  showSuccess: (message: string, options?: Partial<MicroInteraction>) => string;
  showError: (message: string, options?: Partial<MicroInteraction>) => string;
  showHint: (message: string, targetRef: React.RefObject<HTMLElement>, options?: Partial<MicroInteraction>) => string;
  showAchievement: (message: string, options?: Partial<MicroInteraction>) => string;
  showConfetti: (options?: Partial<MicroInteraction>) => string;
}

const MicroInteractionContext = createContext<MicroInteractionContextType | null>(null);

export function MicroInteractionProvider({ children }: { children: ReactNode }) {
  const [interactions, setInteractions] = useState<MicroInteraction[]>([]);

  // Generate a unique ID for each interaction
  const generateId = () => `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a new interaction to the state
  const addInteraction = (interaction: Omit<MicroInteraction, 'id'>) => {
    const id = generateId();
    const newInteraction = { ...interaction, id };
    
    setInteractions(prev => [...prev, newInteraction]);
    
    // If duration is set, automatically remove the interaction after that time
    if (interaction.duration) {
      setTimeout(() => {
        removeInteraction(id);
      }, interaction.duration);
    }
    
    return id;
  };

  // Remove an interaction by ID
  const removeInteraction = (id: string) => {
    setInteractions(prev => prev.filter(interaction => interaction.id !== id));
  };

  // Clear all interactions
  const clearInteractions = () => {
    setInteractions([]);
  };

  // Utility functions for common interaction types
  const showSuccess = (message: string, options?: Partial<MicroInteraction>) => {
    return addInteraction({
      type: 'success',
      message,
      position: 'top-right',
      duration: 3000,
      ...options
    });
  };

  const showError = (message: string, options?: Partial<MicroInteraction>) => {
    return addInteraction({
      type: 'error',
      message,
      position: 'top-right',
      duration: 5000,
      ...options
    });
  };

  const showHint = (message: string, targetRef: React.RefObject<HTMLElement>, options?: Partial<MicroInteraction>) => {
    return addInteraction({
      type: 'hint',
      message,
      position: 'inline',
      targetRef,
      duration: 8000,
      ...options
    });
  };

  const showAchievement = (message: string, options?: Partial<MicroInteraction>) => {
    return addInteraction({
      type: 'achievement',
      message,
      position: 'bottom-right',
      duration: 5000,
      ...options
    });
  };

  const showConfetti = (options?: Partial<MicroInteraction>) => {
    return addInteraction({
      type: 'confetti',
      position: 'center',
      duration: 3000,
      ...options
    });
  };

  return (
    <MicroInteractionContext.Provider
      value={{
        interactions,
        addInteraction,
        removeInteraction,
        clearInteractions,
        showSuccess,
        showError,
        showHint,
        showAchievement,
        showConfetti
      }}
    >
      {children}
    </MicroInteractionContext.Provider>
  );
}

export function useMicroInteraction() {
  const context = useContext(MicroInteractionContext);
  if (!context) {
    throw new Error('useMicroInteraction must be used within a MicroInteractionProvider');
  }
  return context;
}