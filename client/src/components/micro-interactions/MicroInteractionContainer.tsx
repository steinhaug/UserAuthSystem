import React from 'react';
import { HintProvider } from './HintProvider';
import { PointsReward } from './PointsReward';

/**
 * Container component that manages all micro-interactions in the application
 * This is mounted once at the app root level to handle all interactions
 */
export const MicroInteractionContainer: React.FC = () => {
  return (
    <>
      {/* Display contextual hints */}
      <HintProvider maxHints={2} />
      
      {/* Display points rewards */}
      <PointsReward />
      
      {/* Add other micro-interactions here */}
    </>
  );
};