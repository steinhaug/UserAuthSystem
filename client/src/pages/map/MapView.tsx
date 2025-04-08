import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserLocation } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, MinusIcon, ChevronDownIcon, SearchIcon, MapPinIcon, UserIcon } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeoPoint, User } from '@/types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEVELOPMENT_MODE } from '@/lib/constants';

export default function MapView() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [userClusters, setUserClusters] = useState<{position: GeoPoint, count: number}[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Mapbox specific items
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const userMarkers = useRef<mapboxgl.Marker[]>([]);
  const clusterMarkers = useRef<mapboxgl.Marker[]>([]);

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
        if (DEVELOPMENT_MODE) {
          // In development mode, use mock nearby users
          const mockUsers: User[] = [
            {
              id: '1',
              username: 'alice',
              displayName: 'Alice',
              email: 'alice@example.com',
              firebaseId: 'mock-firebase-1',
              photoURL: '',
              location: {
                latitude: userLocation.latitude + 0.001,
                longitude: userLocation.longitude + 0.002
              },
              createdAt: Date.now(),
              lastSeen: Date.now(),
              interests: ['hiking', 'reading', 'photography'],
              status: 'online'
            },
            {
              id: '2',
              username: 'bob',
              displayName: 'Bob',
              email: 'bob@example.com',
              firebaseId: 'mock-firebase-2',
              photoURL: '',
              location: {
                latitude: userLocation.latitude - 0.002,
                longitude: userLocation.longitude + 0.001
              },
              createdAt: Date.now(),
              lastSeen: Date.now(),
              interests: ['cycling', 'cooking', 'gaming'],
              status: 'online'
            },
            {
              id: '3',
              username: 'carol',
              displayName: 'Carol',
              email: 'carol@example.com',
              firebaseId: 'mock-firebase-3',
              photoURL: '',
              location: {
                latitude: userLocation.latitude + 0.002,
                longitude: userLocation.longitude - 0.002
              },
              createdAt: Date.now(),
              lastSeen: Date.now(),
              interests: ['yoga', 'music', 'traveling'],
              status: 'busy'
            }
          ];
          
          setNearbyUsers(mockUsers);
          
          // Create clusters for users that are close to each other
          const mockClusters = [
            { 
              position: { 
                latitude: userLocation.latitude + 0.005, 
                longitude: userLocation.longitude + 0.008 
              }, 
              count: 15 
            },
            { 
              position: { 
                latitude: userLocation.latitude - 0.008, 
                longitude: userLocation.longitude - 0.005 
              }, 
              count: 8 
            }
          ];
          
          setUserClusters(mockClusters);
          
        } else {
          // In a real app, we would use geospatial queries from Firebase
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
        }
        
      } catch (error) {
        console.error('Error fetching nearby users:', error);
      }
    };
    
    fetchNearbyUsers();
  }, [userLocation, currentUser]);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Set Mapbox access token
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [10.7522, 59.9139], // default to Oslo
      zoom: 12
    });
    
    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    
    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);
  
  // Update map center when user location changes
  useEffect(() => {
    if (!map.current || !userLocation) return;
    
    // Center map on user location if this is the first location update
    if (!userMarker.current) {
      map.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 14,
        essential: true
      });
    }
    
    // Add or update user marker
    if (userMarker.current) {
      userMarker.current.setLngLat([userLocation.longitude, userLocation.latitude]);
    } else {
      // Create a custom HTML element for the marker
      const el = document.createElement('div');
      el.className = 'relative';
      
      const marker = document.createElement('div');
      marker.className = 'w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-2 border-white';
      marker.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
      
      const dot = document.createElement('div');
      dot.className = 'absolute bottom-0 left-5 w-3 h-3 bg-green-500 rounded-full border border-white';
      
      el.appendChild(marker);
      el.appendChild(dot);
      
      userMarker.current = new mapboxgl.Marker(el)
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map.current);
    }
  }, [userLocation]);
  
  // Add markers for nearby users
  useEffect(() => {
    if (!map.current || !nearbyUsers.length) return;
    
    // Clear existing markers
    userMarkers.current.forEach(marker => marker.remove());
    userMarkers.current = [];
    
    // Add markers for each nearby user
    nearbyUsers.forEach(user => {
      if (!user.location) return;
      
      // Create a custom HTML element for the marker
      const el = document.createElement('div');
      el.className = 'w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white hover:scale-110 transition-transform cursor-pointer';
      el.textContent = user.displayName?.charAt(0) || 'U';
      
      // Create the marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([user.location.longitude, user.location.latitude])
        .addTo(map.current!);
      
      // Add click event to show popup
      el.addEventListener('click', () => {
        setSelectedUser(user);
      });
      
      userMarkers.current.push(marker);
    });
    
    // Add markers for clusters
    clusterMarkers.current.forEach(marker => marker.remove());
    clusterMarkers.current = [];
    
    userClusters.forEach(cluster => {
      const el = document.createElement('div');
      el.className = 'w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center border-2 border-white';
      el.textContent = `+${cluster.count}`;
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([cluster.position.longitude, cluster.position.latitude])
        .addTo(map.current!);
      
      clusterMarkers.current.push(marker);
    });
  }, [nearbyUsers, userClusters]);
  
  // Show popup for selected user
  useEffect(() => {
    if (!map.current) return;
    
    // Remove existing popup
    const popupElement = document.querySelector('.mapboxgl-popup');
    if (popupElement) {
      popupElement.remove();
    }
    
    // Show popup for selected user
    if (selectedUser && selectedUser.location) {
      const popupContent = document.createElement('div');
      popupContent.className = 'p-2';
      
      const title = document.createElement('h3');
      title.className = 'font-semibold';
      title.textContent = selectedUser.displayName;
      
      const status = document.createElement('p');
      status.className = 'text-sm text-gray-600';
      status.textContent = selectedUser.status || 'Online';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'mt-2 flex space-x-2';
      
      const messageButton = document.createElement('button');
      messageButton.className = 'px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100';
      messageButton.textContent = 'Message';
      messageButton.onclick = () => {
        setSelectedUser(null);
        setLocation(`/chat/${selectedUser.id}`);
      };
      
      const profileButton = document.createElement('button');
      profileButton.className = 'px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90';
      profileButton.textContent = 'View Profile';
      profileButton.onclick = () => {
        setSelectedUser(null);
        setLocation(`/profile/${selectedUser.id}`);
      };
      
      buttonContainer.appendChild(messageButton);
      buttonContainer.appendChild(profileButton);
      
      popupContent.appendChild(title);
      popupContent.appendChild(status);
      popupContent.appendChild(buttonContainer);
      
      // Create and show popup
      new mapboxgl.Popup({ closeOnClick: false })
        .setLngLat([selectedUser.location.longitude, selectedUser.location.latitude])
        .setDOMContent(popupContent)
        .addTo(map.current)
        .on('close', () => setSelectedUser(null));
    }
  }, [selectedUser, setLocation]);

  const handleZoomIn = () => {
    if (!map.current) return;
    map.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!map.current) return;
    map.current.zoomOut();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation would depend on the mapping service used
    console.log('Searching for:', searchQuery);
    // In a real application, we would use Mapbox Geocoding API here
  };

  const handleCenterOnUser = () => {
    if (!map.current || !userLocation) return;
    
    map.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 15,
      essential: true
    });
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
      <div className="map-container relative" style={{ height: 'calc(100vh - 6rem)' }}>
        {/* Map container */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
        
        {/* User's Position Button */}
        <Button 
          onClick={handleCenterOnUser}
          className="absolute bottom-20 right-4 bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white p-3 rounded-full shadow-lg z-10"
        >
          <ChevronDownIcon className="h-6 w-6" />
        </Button>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="absolute top-4 left-4 right-16 mx-auto z-10">
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
  );
}
