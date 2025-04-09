import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  HelpCircle, 
  X, 
  ArrowRight,
  MapPin,
  MessageCircle,
  Activity,
  Star,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type HintPosition = 'top' | 'right' | 'bottom' | 'left' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';

export type ContextualHintProps = {
  id: string;
  title: string;
  content: string;
  position?: HintPosition;
  icon?: React.ReactNode;
  onDismiss?: (id: string) => void;
  targetRef?: React.RefObject<HTMLElement>;
  isImportant?: boolean;
  type?: 'info' | 'tip' | 'warning' | 'success';
};

// Get hint icon based on type
const getHintIcon = (type: 'info' | 'tip' | 'warning' | 'success', customIcon?: React.ReactNode) => {
  if (customIcon) return customIcon;
  
  switch (type) {
    case 'info':
      return <Info className="h-5 w-5 text-blue-500" />;
    case 'tip':
      return <HelpCircle className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <Info className="h-5 w-5 text-yellow-500" />;
    case 'success':
      return <Star className="h-5 w-5 text-purple-500" />;
    default:
      return <HelpCircle className="h-5 w-5 text-primary" />;
  }
};

// Calculate position based on target element and desired position
const calculatePosition = (
  targetRef: React.RefObject<HTMLElement> | undefined,
  position: HintPosition
): { top?: string; left?: string; right?: string; bottom?: string; transform?: string } => {
  if (!targetRef?.current) {
    // If no target, use default position in the center
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const rect = targetRef.current.getBoundingClientRect();
  const buffer = 20; // Space between target and hint

  switch (position) {
    case 'top':
      return {
        top: `${window.scrollY + rect.top - buffer}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
      };
    case 'right':
      return {
        top: `${window.scrollY + rect.top + rect.height / 2}px`,
        left: `${rect.right + buffer}px`,
        transform: 'translateY(-50%)',
      };
    case 'bottom':
      return {
        top: `${window.scrollY + rect.bottom + buffer}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
      };
    case 'left':
      return {
        top: `${window.scrollY + rect.top + rect.height / 2}px`,
        left: `${rect.left - buffer}px`,
        transform: 'translate(-100%, -50%)',
      };
    case 'top-right':
      return {
        top: `${window.scrollY + rect.top - buffer}px`,
        left: `${rect.right}px`,
        transform: 'translateY(-100%)',
      };
    case 'top-left':
      return {
        top: `${window.scrollY + rect.top - buffer}px`,
        left: `${rect.left}px`,
        transform: 'translate(-90%, -100%)',
      };
    case 'bottom-right':
      return {
        top: `${window.scrollY + rect.bottom + buffer}px`,
        left: `${rect.right}px`,
        transform: 'translateX(-90%)',
      };
    case 'bottom-left':
      return {
        top: `${window.scrollY + rect.bottom + buffer}px`,
        left: `${rect.left}px`,
      };
    case 'center':
    default:
      return {
        top: `${window.scrollY + rect.top + rect.height / 2}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translate(-50%, -50%)',
      };
  }
};

export const ContextualHint: React.FC<ContextualHintProps> = ({
  id,
  title,
  content,
  position = 'bottom',
  icon,
  onDismiss,
  targetRef,
  isImportant = false,
  type = 'info',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [pos, setPos] = useState<any>({});
  const [fadeAnim, setFadeAnim] = useState(true);
  const hintRef = useRef<HTMLDivElement>(null);

  // Update position when target element moves
  useEffect(() => {
    const handleResize = () => {
      setPos(calculatePosition(targetRef, position));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [targetRef, position]);

  // Start fade-in animation
  useEffect(() => {
    setFadeAnim(true);
  }, []);

  const handleDismiss = () => {
    setFadeAnim(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) onDismiss(id);
    }, 300);
  };

  if (!isVisible) return null;

  // Get the right icon based on type or custom icon
  const hintIcon = getHintIcon(type, icon);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={hintRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: fadeAnim ? 1 : 0, scale: fadeAnim ? 1 : 0.9 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            zIndex: 1000,
            maxWidth: '300px',
            ...pos,
          }}
          className={`contextual-hint ${isImportant ? 'important-hint' : ''}`}
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {hintIcon}
                <h3 className="font-medium">{title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3">
              <p className="text-sm">{content}</p>
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handleDismiss} className="text-xs px-2">
                  Jeg forstår
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};