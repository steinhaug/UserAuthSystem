import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Plus } from 'lucide-react';
import { useMicroInteractions } from '@/contexts/MicroInteractionsContext';
import './micro-interactions.css';

// Component for displaying points reward animations
export const PointsReward: React.FC = () => {
  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number, color: string }>>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Custom styles for toast notifications
  useEffect(() => {
    // Add CSS to style the points reward toast differently
    const style = document.createElement('style');
    style.innerHTML = `
      .points-reward-toast {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        border: none;
        font-weight: 600;
      }
      
      .points-reward-toast .title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: white;
      }
      
      .points-reward-toast .description {
        color: rgba(255, 255, 255, 0.9);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Create confetti particles on points award
  const createParticles = (amount = 20) => {
    setIsAnimating(true);
    
    const newParticles = Array.from({ length: amount }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'][Math.floor(Math.random() * 5)]
    }));
    
    setParticles(newParticles);
    
    // Clear particles after animation
    setTimeout(() => {
      setParticles([]);
      setIsAnimating(false);
    }, 2000);
  };
  
  // Listen for customized toast messages that indicate point awards
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement && node.classList.contains('points-reward-toast')) {
              createParticles();
            }
          });
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return (
    <AnimatePresence>
      {isAnimating && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Particles animation */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                x: `calc(50% + ${Math.random() * 20 - 10}px)`, 
                y: `calc(50% + ${Math.random() * 20 - 10}px)`,
                opacity: 1,
                scale: 0
              }}
              animate={{ 
                x: `calc(${particle.x}% - 5px)`, 
                y: `calc(${particle.y}% - 5px)`,
                opacity: [1, 1, 0],
                scale: [0, 1, 0.5]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 1.5 + Math.random(),
                ease: "easeOut"
              }}
              style={{ 
                position: 'absolute',
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                borderRadius: '50%',
                backgroundColor: particle.color
              }}
            />
          ))}
          
          {/* Central animation */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className="text-4xl text-amber-500">
              <Award className="h-20 w-20 filter drop-shadow-lg" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};