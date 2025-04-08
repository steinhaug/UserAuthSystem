import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserLocation } from '@/lib/firebase';
import UserDot from '@/components/ui/UserDot';
import UserCluster from '@/components/ui/UserCluster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, MinusIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeoPoint, User } from '@/types';

export default function MapView() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(15); // 1-20, with 20 being the closest
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [userClusters, setUserClusters] = useState<{position: GeoPoint, count: number}[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);

  // Get user's location and update Firebase
  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
      return;
    }

    // Get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        
        // Update user's location in Firebase
        if (currentUser) {
          updateUserLocation(currentUser.uid, { latitude, longitude });
        }
        
        setIsLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLoading(false);
        
        // Fall back to a default location (e.g., city center)
        setUserLocation({ latitude: 59.9139, longitude: 10.7522 }); // Oslo coordinates
      },
      { enableHighAccuracy: true }
    );

    // Set up continuous location tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        
        // Update user's location in Firebase (but throttle it)
        if (currentUser) {
          updateUserLocation(currentUser.uid, { latitude, longitude });
        }
      },
      (error) => {
        console.error('Error watching location:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    // Clean up
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [currentUser, setLocation]);

  // Fetch nearby users when location changes
  useEffect(() => {
    const fetchNearbyUsers = async () => {
      if (!userLocation || !currentUser) return;

      try {
        // In a real app, we would use geospatial queries, 
        // but for simplicity we'll get recent users
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('id', '!=', currentUser.uid),
          orderBy('lastSeen', 'desc'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const users: User[] = [];
        
        querySnapshot.forEach((doc) => {
          // Only add users with location data
          const userData = doc.data();
          if (userData.location) {
            users.push({ id: doc.id, ...userData } as User);
          }
        });
        
        setNearbyUsers(users);
        
        // Create clusters for users that are close to each other
        // This is a simplified implementation
        const clusters: {position: GeoPoint, count: number}[] = [
          { position: { latitude: userLocation.latitude + 0.005, longitude: userLocation.longitude + 0.008 }, count: 15 },
          { position: { latitude: userLocation.latitude - 0.008, longitude: userLocation.longitude - 0.005 }, count: 8 }
        ];
        
        setUserClusters(clusters);
        
      } catch (error) {
        console.error('Error fetching nearby users:', error);
      }
    };
    
    fetchNearbyUsers();
  }, [userLocation, currentUser]);

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 1, 20));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 1, 1));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation would depend on the mapping service used
    console.log('Searching for:', searchQuery);
  };

  const handleCenterOnUser = () => {
    // Re-center map on user's location
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="map-container" style={{ height: 'calc(100vh - 6rem)' }}>
        <div 
          ref={mapRef}
          className="map relative"
          style={{ 
            height: '100%',
            width: '100%',
            backgroundImage: 'url("https://images.unsplash.com/photo-1618387231232-e0b35a2f9b31?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80")',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            position: 'relative'
          }}
        >
          {/* Sample User Dots (would be dynamically generated from nearbyUsers) */}
          <UserDot position={{ top: '45%', left: '48%' }} />
          <UserDot position={{ top: '46%', left: '50%' }} />
          <UserDot position={{ top: '47%', left: '47%' }} />
          <UserDot position={{ top: '44%', left: '51%' }} isFriend />
          
          {/* Sample Clusters */}
          <UserCluster position={{ top: '30%', left: '65%' }} count={15} />
          <UserCluster position={{ top: '65%', left: '30%' }} count={8} />
          
          {/* User's Position Button */}
          <Button 
            onClick={handleCenterOnUser}
            className="absolute bottom-4 right-4 bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white p-3 rounded-full shadow-lg"
          >
            <ChevronDownIcon className="h-6 w-6" />
          </Button>
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <Button onClick={handleZoomIn} className="bg-white p-2 rounded-full shadow-md text-gray-600">
              <PlusIcon className="h-6 w-6" />
            </Button>
            <Button onClick={handleZoomOut} className="bg-white p-2 rounded-full shadow-md text-gray-600">
              <MinusIcon className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="absolute top-4 left-4 right-16 mx-auto">
            <div className="bg-white rounded-full shadow-md flex items-center px-4 py-2">
              <SearchIcon className="h-5 w-5 text-gray-400 mr-3" />
              <Input 
                type="text"
                placeholder="Search locations..." 
                className="w-full outline-none text-sm border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
