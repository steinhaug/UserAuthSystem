import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Medal, Award, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AchievementProps {
  title: string;
  description?: string;
  type?: 'trophy' | 'medal' | 'star' | 'award' | 'crown' | 'zap';
  level?: 'bronze' | 'silver' | 'gold' | 'platinum';
  points?: number;
  onClose?: () => void;
  className?: string;
}

// Colors for different levels
const levelColors = {
  bronze: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    icon: 'text-amber-600',
    text: 'text-amber-800'
  },
  silver: {
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    icon: 'text-slate-500',
    text: 'text-slate-700'
  },
  gold: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    icon: 'text-yellow-600',
    text: 'text-yellow-800'
  },
  platinum: {
    bg: 'bg-indigo-100',
    border: 'border-indigo-300',
    icon: 'text-indigo-600',
    text: 'text-indigo-800'
  }
};

// Get icon based on type
const getIcon = (type: AchievementProps['type'], className: string) => {
  switch (type) {
    case 'trophy':
      return <Trophy className={className} />;
    case 'medal':
      return <Medal className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'zap':
      return <Zap className={className} />;
    default:
      return <Trophy className={className} />;
  }
};

export const Achievement: React.FC<AchievementProps> = ({
  title,
  description,
  type = 'trophy',
  level = 'gold',
  points,
  onClose,
  className,
}) => {
  const colors = levelColors[level];
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
      }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className={cn(
        "flex flex-col items-center p-4 rounded-lg shadow-lg max-w-xs",
        colors.bg,
        colors.border,
        "border-2",
        className
      )}
    >
      <div className="flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ 
            scale: 1, 
            rotate: 0,
          }}
          transition={{ 
            type: 'spring', 
            delay: 0.1,
            duration: 0.7,
          }}
          className={cn(
            "w-16 h-16 flex items-center justify-center rounded-full mb-3",
            "bg-white shadow-md"
          )}
        >
          {getIcon(type, cn("w-10 h-10", colors.icon))}
        </motion.div>
      </div>
      
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h3 className={cn("font-bold text-lg mb-1", colors.text)}>
          {title}
        </h3>
        
        {description && (
          <p className="text-sm mb-2 text-gray-600">
            {description}
          </p>
        )}
        
        {points !== undefined && (
          <div className="flex items-center justify-center mt-2 space-x-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{points} poeng</span>
          </div>
        )}
      </motion.div>
      
      {onClose && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="mt-3 px-4 py-2 bg-white rounded-full shadow text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Lukk
        </motion.button>
      )}
    </motion.div>
  );
};