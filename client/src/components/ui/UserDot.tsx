import { CSSProperties } from 'react';

interface UserDotProps {
  position: {
    top: string;
    left: string;
  };
  isFriend?: boolean;
}

export default function UserDot({ position, isFriend = false }: UserDotProps) {
  const dotStyles: CSSProperties = {
    position: 'absolute',
    top: position.top,
    left: position.left,
    width: '12px',
    height: '12px',
    backgroundColor: isFriend ? '#4CAF50' : '#FF5252',
    borderRadius: '50%',
    border: '2px solid white',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 0 rgba(255, 82, 82, 0.4)',
    animation: 'pulse 2s infinite'
  };

  return (
    <div 
      className={`user-dot ${isFriend ? 'friend' : ''}`} 
      style={dotStyles} 
    />
  );
}
