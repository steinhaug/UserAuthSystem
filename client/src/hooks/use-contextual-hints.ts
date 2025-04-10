import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { HintPosition } from "@/components/micro-interactions/ContextualHint";

export interface HintConfig {
  id: string;
  title: string;
  content: string;
  position?: HintPosition;
  isImportant?: boolean;
  type?: 'info' | 'tip' | 'warning' | 'success';
  condition?: () => boolean;
  showOnce?: boolean;
  delayMs?: number;
  order?: number;
}

export interface UseContextualHintsOptions {
  maxShownHints?: number;
  forceReset?: boolean;
}

// Predefined hints for the application
const getHints = (): HintConfig[] => [
  // Onboarding / Welcome
  {
    id: 'welcome-tour',
    title: 'Velkommen til Comemingel!',
    content: 'Her kan du finne aktiviteter, møte andre ploggers, og delta i utfordringer. Utforsk kartet for å se hvem som er i nærheten.',
    position: 'bottom',
    isImportant: true,
    type: 'info',
    showOnce: true,
    order: 1
  },
  
  // Map usage
  {
    id: 'map-exploration',
    title: 'Utforsk i nærheten',
    content: 'Kartet viser deg aktive ploggers i nærheten. Grønne markører er aktive brukere, grå er inaktive. Zoom inn for å se mer detaljer.',
    position: 'bottom',
    type: 'tip',
    showOnce: true,
    order: 2
  },
  
  // New features
  {
    id: 'new-feature-chat',
    title: 'Ny funksjon: Kryptert chat',
    content: 'Vi har lagt til ende-til-ende kryptert meldingsutveksling! Dine meldinger er nå enda mer private og sikre.',
    position: 'top-right',
    isImportant: true,
    type: 'success',
    showOnce: true
  },
  
  // Activity completions
  {
    id: 'activity-completed',
    title: 'Aktivitet fullført!',
    content: 'Gratulerer med å fullføre aktiviteten! Du har tjent poeng og forbedret din posisjon på rangeringslisten.',
    position: 'bottom',
    type: 'success',
    showOnce: false
  },
  
  // Recommendations
  {
    id: 'try-recommendations',
    title: 'Sjekk ut anbefalte aktiviteter',
    content: 'Basert på dine preferanser har vi laget personlige anbefalinger til aktiviteter du kan like.',
    position: 'bottom-right',
    type: 'tip',
    showOnce: true
  }
];

export function useContextualHints(options?: UseContextualHintsOptions | number) {
  const [location] = useLocation();
  const { userProfile, isLoading } = useAuth();
  
  // Handle backward compatibility
  const maxShownHints = 0; // Satt til 0 for å deaktivere alle hint
  const forceReset = typeof options === 'object' ? options?.forceReset : false;

  // State for active hints
  const [activeHints, setActiveHints] = useState<HintConfig[]>([]);
  
  // Get all available hints
  const allHints = getHints();
  
  // Check if we should show hints based on page and conditions
  useEffect(() => {
    // Don't show hints while the auth state is loading
    if (isLoading) return;
    
    // If forced reset, clear all dismissed hints
    if (forceReset) {
      localStorage.removeItem('dismissedHints');
      setActiveHints([]);
    }
    
    // Get previously dismissed hints from localStorage
    const dismissedHints = JSON.parse(localStorage.getItem('dismissedHints') || '[]');
    
    // Show location-specific hints
    const pageHints = allHints.filter(hint => {
      // Skip already dismissed hints that should only show once
      if (hint.showOnce && dismissedHints.includes(hint.id)) {
        return false;
      }
      
      // Check hint conditions
      if (hint.condition && !hint.condition()) {
        return false;
      }
      
      // Special conditions for certain hints
      if (hint.id === 'activity-completed') {
        return localStorage.getItem('showActivityCompletionHint') === 'true';
      }
      
      if (hint.id === 'try-recommendations') {
        return localStorage.getItem('hasSetActivityPreferences') === 'true';
      }
      
      return true;
    });
    
    // Sort hints by priority/order
    const sortedHints = pageHints.sort((a, b) => (a.order || 99) - (b.order || 99));
    
    // We don't want to show too many hints at once
    const hintsToShow = sortedHints.slice(0, maxShownHints);
    
    // Only update state if hints have changed
    if (JSON.stringify(hintsToShow) !== JSON.stringify(activeHints)) {
      // Apply delay if needed
      hintsToShow.forEach((hint, index) => {
        if (hint.delayMs) {
          setTimeout(() => {
            setActiveHints(prev => {
              if (prev.some(h => h.id === hint.id)) {
                return prev;
              }
              return [...prev, hint];
            });
          }, hint.delayMs);
        }
      });
      
      setActiveHints(hintsToShow.filter(hint => !hint.delayMs));
    }
  }, [location, isLoading, userProfile, maxShownHints, forceReset]);
  
  // Handle dismissing a hint
  const dismissHint = (hintId: string) => {
    setActiveHints(prev => prev.filter(hint => hint.id !== hintId));
  };
  
  // Function to manually trigger a specific hint to show
  const triggerHint = (hintId: string) => {
    const hint = allHints.find(h => h.id === hintId);
    if (hint) {
      // Check if already dismissed
      const dismissedHints = JSON.parse(localStorage.getItem('dismissedHints') || '[]');
      if (!dismissedHints.includes(hintId)) {
        setActiveHints(prev => {
          if (!prev.some(h => h.id === hintId)) {
            return [...prev, hint];
          }
          return prev;
        });
        return true;
      }
    }
    return false;
  };
  
  // Function to mark a hint as eligible to show (for programmatic triggers)
  const markHintEligible = (hintId: string, value: boolean = true) => {
    if (hintId === 'activity-completed') {
      localStorage.setItem('showActivityCompletionHint', value ? 'true' : 'false');
    } else if (hintId === 'try-recommendations') {
      localStorage.setItem('hasSetActivityPreferences', value ? 'true' : 'false');
    }
    // Add more special cases as needed
  };
  
  return { 
    activeHints, 
    dismissHint, 
    triggerHint,
    markHintEligible
  };
}