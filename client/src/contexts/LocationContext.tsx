import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from './AuthContext';
import { DEVELOPMENT_MODE } from '@/lib/constants';

interface LocationContextType {
  userLocation: GeolocationPosition | null;
  nearbyUsers: NearbyUser[];
  isLocationTracking: boolean;
  locationError: string | null;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
}

interface NearbyUser {
  userId: string;
  latitude: number;
  longitude: number;
  lastUpdated: Date;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const { isAuthenticated } = useAuth();
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { connected, sendMessage } = useWebSocket(handleWebSocketMessage);

  // Handle incoming WebSocket messages
  function handleWebSocketMessage(data: any) {
    if (data.type === 'nearby_user') {
      updateNearbyUsers(data.userId, data.location.latitude, data.location.longitude);
    }
  }

  // Update the list of nearby users
  function updateNearbyUsers(userId: string, latitude: number, longitude: number) {
    setNearbyUsers(prevUsers => {
      // Find if the user already exists in the list
      const existingUserIndex = prevUsers.findIndex(user => user.userId === userId);
      
      if (existingUserIndex >= 0) {
        // Update existing user
        const updatedUsers = [...prevUsers];
        updatedUsers[existingUserIndex] = {
          ...updatedUsers[existingUserIndex],
          latitude,
          longitude,
          lastUpdated: new Date()
        };
        return updatedUsers;
      } else {
        // Add new user
        return [...prevUsers, {
          userId,
          latitude,
          longitude,
          lastUpdated: new Date()
        }];
      }
    });
  }

  // Start tracking user location
  async function startLocationTracking() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    try {
      // First, get immediate location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      setUserLocation(position);
      setLocationError(null);
      
      // Send location update via WebSocket if connected
      if (connected && !DEVELOPMENT_MODE) {
        sendLocationUpdate(position.coords.latitude, position.coords.longitude);
      }
      
      // Then start watching for changes
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation(position);
          setLocationError(null);
          
          // Send location update via WebSocket if connected
          if (connected && !DEVELOPMENT_MODE) {
            sendLocationUpdate(position.coords.latitude, position.coords.longitude);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(`Error getting location: ${error.message}`);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
      
      setWatchId(id);
      setIsLocationTracking(true);
    } catch (error: any) {
      console.error("Error starting location tracking:", error);
      setLocationError(`Error starting location tracking: ${error.message}`);
    }
  }

  // Stop tracking user location
  function stopLocationTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsLocationTracking(false);
    }
  }

  // Send location update via WebSocket
  function sendLocationUpdate(latitude: number, longitude: number) {
    if (connected) {
      sendMessage({
        type: 'location_update',
        latitude,
        longitude
      });
    }
  }

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Start location tracking automatically when authenticated in development mode
  useEffect(() => {
    if (DEVELOPMENT_MODE && isAuthenticated && !isLocationTracking) {
      // In development mode, simulate location without actually using the browser API
      setUserLocation({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      } as GeolocationPosition);
      
      setIsLocationTracking(true);
      
      // Add some mock nearby users in development mode
      setNearbyUsers([
        {
          userId: 'user-1',
          latitude: 37.7752,
          longitude: -122.4195,
          lastUpdated: new Date()
        },
        {
          userId: 'user-2',
          latitude: 37.7747,
          longitude: -122.4190,
          lastUpdated: new Date()
        }
      ]);
    }
  }, [isAuthenticated, isLocationTracking]);

  const value = {
    userLocation,
    nearbyUsers,
    isLocationTracking,
    locationError,
    startLocationTracking,
    stopLocationTracking
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}