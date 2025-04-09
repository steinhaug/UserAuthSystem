import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  AlertTriangle, 
  Trophy, 
  HelpCircle,
  PartyPopper
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  MicroInteraction, 
  MicroInteractionPosition, 
  MicroInteractionType 
} from '@/contexts/MicroInteractionContext';

// Animation variants
const variants = {
  initial: (position: MicroInteractionPosition) => {
    switch (position) {
      case 'top-left':
        return { opacity: 0, x: -20, y: 0 };
      case 'top-right':
        return { opacity: 0, x: 20, y: 0 };
      case 'bottom-left':
        return { opacity: 0, x: -20, y: 0 };
      case 'bottom-right':
        return { opacity: 0, x: 20, y: 0 };
      case 'center':
        return { opacity: 0, scale: 0.9 };
      case 'inline':
        return { opacity: 0, y: 5 };
      default:
        return { opacity: 0 };
    }
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: (position: MicroInteractionPosition) => {
    switch (position) {
      case 'top-left':
        return { opacity: 0, x: -20, transition: { duration: 0.2 } };
      case 'top-right':
        return { opacity: 0, x: 20, transition: { duration: 0.2 } };
      case 'bottom-left':
        return { opacity: 0, x: -20, transition: { duration: 0.2 } };
      case 'bottom-right':
        return { opacity: 0, x: 20, transition: { duration: 0.2 } };
      case 'center':
        return { opacity: 0, scale: 0.9, transition: { duration: 0.2 } };
      case 'inline':
        return { opacity: 0, y: 5, transition: { duration: 0.2 } };
      default:
        return { opacity: 0, transition: { duration: 0.2 } };
    }
  }
};

// Position styling
const getPositionStyle = (position: MicroInteractionPosition): string => {
  switch (position) {
    case 'top-left':
      return 'fixed top-4 left-4 z-50';
    case 'top-right':
      return 'fixed top-4 right-4 z-50';
    case 'bottom-left':
      return 'fixed bottom-4 left-4 z-50';
    case 'bottom-right':
      return 'fixed bottom-4 right-4 z-50';
    case 'center':
      return 'fixed inset-0 flex items-center justify-center z-50';
    case 'inline':
      return 'relative';
    default:
      return '';
  }
};

// Type styling and icons
const getTypeStyle = (type: MicroInteractionType): { className: string, icon: React.ReactNode } => {
  switch (type) {
    case 'success':
      return {
        className: 'bg-green-50 border-green-400 text-green-700',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
      };
    case 'error':
      return {
        className: 'bg-red-50 border-red-400 text-red-700',
        icon: <XCircle className="h-5 w-5 text-red-500" />
      };
    case 'info':
      return {
        className: 'bg-blue-50 border-blue-400 text-blue-700',
        icon: <Info className="h-5 w-5 text-blue-500" />
      };
    case 'warning':
      return {
        className: 'bg-amber-50 border-amber-400 text-amber-700',
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
      };
    case 'achievement':
      return {
        className: 'bg-purple-50 border-purple-400 text-purple-700',
        icon: <Trophy className="h-5 w-5 text-purple-500" />
      };
    case 'hint':
      return {
        className: 'bg-slate-50 border-slate-400 text-slate-700',
        icon: <HelpCircle className="h-5 w-5 text-slate-500" />
      };
    case 'confetti':
      return {
        className: 'bg-transparent',
        icon: <PartyPopper className="h-10 w-10 text-yellow-500" />
      };
    default:
      return {
        className: 'bg-gray-50 border-gray-400 text-gray-700',
        icon: <Info className="h-5 w-5 text-gray-500" />
      };
  }
};

interface MicroInteractionRendererProps {
  interaction: MicroInteraction;
  onClose: (id: string) => void;
}

export const MicroInteractionRenderer: React.FC<MicroInteractionRendererProps> = ({
  interaction,
  onClose
}) => {
  const { id, type, message, position = 'top-right', element } = interaction;
  const [isVisible, setIsVisible] = useState(true);
  const positionClass = getPositionStyle(position);
  const { className, icon } = getTypeStyle(type);

  useEffect(() => {
    // For inline interactions with a targetRef, position it relative to the target
    if (position === 'inline' && interaction.targetRef?.current) {
      const targetElement = interaction.targetRef.current;
      const targetRect = targetElement.getBoundingClientRect();
      
      // Find or create the container for this interaction
      let container = document.getElementById(`interaction-container-${id}`);
      if (!container) {
        container = document.createElement('div');
        container.id = `interaction-container-${id}`;
        container.style.position = 'absolute';
        container.style.zIndex = '50';
        document.body.appendChild(container);
      }
      
      // Position it near the target element
      container.style.top = `${targetRect.bottom + window.scrollY + 5}px`;
      container.style.left = `${targetRect.left + window.scrollX}px`;
    }
    
    return () => {
      // Clean up any created containers
      const container = document.getElementById(`interaction-container-${id}`);
      if (container) {
        container.remove();
      }
    };
  }, [id, position, interaction.targetRef]);

  // Handle close
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for exit animation
  };

  // Special rendering for confetti
  if (type === 'confetti') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={positionClass}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            custom={position}
          >
            <div className="confetti-container">
              {/* This would be replaced by an actual confetti animation component */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  rotate: [0, 15, -15, 0] 
                }}
                transition={{ 
                  duration: 0.6,
                  times: [0, 0.7, 1],
                  ease: "easeOut" 
                }}
                className="flex flex-col items-center justify-center"
              >
                {icon}
                {message && (
                  <p className="text-center font-medium mt-2 text-lg">{message}</p>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // For custom elements, just wrap them in the animation
  if (element) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={positionClass}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            custom={position}
          >
            {element}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Default rendering for standard interactions
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={positionClass}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          custom={position}
        >
          <div 
            className={cn(
              "rounded-md border p-4 shadow-sm", 
              className
            )}
            style={{ maxWidth: "350px" }}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {icon}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{message}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  type="button"
                  className="inline-flex rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={handleClose}
                >
                  <span className="sr-only">Lukk</span>
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};