import React, { useEffect } from 'react';
import { ContextualHint } from './ContextualHint';
import { useContextualHints } from '@/hooks/use-contextual-hints';
import { MapPin, MessageCircle, Target, Star, Sparkles } from 'lucide-react';

type HintProviderProps = {
  maxHints?: number; // Maximum number of hints to show at once
};

export const HintProvider: React.FC<HintProviderProps> = ({ maxHints = 2 }) => {
  const { activeHints, dismissHint } = useContextualHints({maxShownHints: maxHints});
  
  // Special hint icon map
  const iconMap: Record<string, React.ReactNode> = {
    'welcome-tour': <Target className="h-5 w-5 text-blue-500" />,
    'map-exploration': <MapPin className="h-5 w-5 text-green-500" />,
    'new-feature-chat': <MessageCircle className="h-5 w-5 text-purple-500" />,
    'activity-completed': <Star className="h-5 w-5 text-yellow-500" />,
    'try-recommendations': <Sparkles className="h-5 w-5 text-amber-500" />,
  };
  
  // Render all active contextual hints
  return (
    <>
      {activeHints.map((hint) => (
        <ContextualHint
          key={hint.id}
          id={hint.id}
          title={hint.title}
          content={hint.content}
          position={hint.position}
          icon={iconMap[hint.id]}
          onDismiss={dismissHint}
          isImportant={hint.isImportant}
          type={hint.type}
        />
      ))}
    </>
  );
};