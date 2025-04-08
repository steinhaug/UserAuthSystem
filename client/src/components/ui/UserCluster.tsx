import { CSSProperties } from 'react';

interface UserClusterProps {
  position: {
    top: string;
    left: string;
  };
  count: number;
}

export default function UserCluster({ position, count }: UserClusterProps) {
  const clusterStyles: CSSProperties = {
    position: 'absolute',
    top: position.top,
    left: position.left,
    width: '28px',
    height: '28px',
    backgroundColor: 'rgba(255, 82, 82, 0.8)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '12px',
    border: '2px solid white',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
  };

  return (
    <div className="user-cluster" style={clusterStyles}>
      {count}
    </div>
  );
}
