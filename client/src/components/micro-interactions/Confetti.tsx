import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface ConfettiProps {
  duration?: number;
  pieces?: number;
  colors?: string[];
  spread?: number;
  message?: string;
  onComplete?: () => void;
}

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  delay: number;
}

export const Confetti: React.FC<ConfettiProps> = ({
  duration = 4000,
  pieces = 100,
  colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'],
  spread = 100,
  message,
  onComplete
}) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Generate confetti pieces
    const newConfetti: ConfettiPiece[] = [];
    for (let i = 0; i < pieces; i++) {
      newConfetti.push({
        id: `confetti-${i}`,
        x: Math.random() * spread - spread / 2, // Spread horizontally
        y: -10, // Start from top
        size: Math.random() * 10 + 5, // Random size
        rotation: Math.random() * 360, // Random rotation
        color: colors[Math.floor(Math.random() * colors.length)], // Random color
        delay: Math.random() * 0.5 // Random delay
      });
    }
    
    setConfetti(newConfetti);
    
    // Clean up after duration
    const timeoutId = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);
    
    return () => clearTimeout(timeoutId);
  }, [pieces, colors, spread, duration, onComplete]);
  
  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-50"
    >
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ 
            x: 0, 
            y: -10, 
            rotate: 0,
            opacity: 1 
          }}
          animate={{ 
            x: piece.x, 
            y: [0, window.innerHeight - 50], 
            rotate: [0, piece.rotation],
            opacity: [1, 1, 0]
          }}
          transition={{ 
            duration: duration / 1000,
            delay: piece.delay,
            ease: "easeOut",
            times: [0, 0.9, 1] // Opacity timing
          }}
          style={{
            position: 'absolute',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            top: '0',
            left: '50%'
          }}
        />
      ))}
      
      {message && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-white bg-opacity-80 p-4 rounded-lg shadow-lg text-center"
        >
          <h3 className="text-xl font-bold text-primary">{message}</h3>
        </motion.div>
      )}
    </div>
  );
};