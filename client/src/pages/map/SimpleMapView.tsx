import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon } from 'lucide-react';

// Set Mapbox token globally
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
if (!mapboxToken) {
  console.error("Missing Mapbox token! Set VITE_MAPBOX_TOKEN in your environment variables.");
} else {
  mapboxgl.accessToken = mapboxToken;
  console.log("Mapbox token set successfully, length:", mapboxToken.length);
}

export default function SimpleMapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  
  // Get user's location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        console.log("Got user location:", latitude, longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        // Fall back to Oslo coordinates
        setUserLocation({ latitude: 59.9139, longitude: 10.7522 });
      }
    );
  }, []);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken) {
      console.error("Can't initialize map - either container is missing or no token is set");
      return;
    }
    
    try {
      console.log("Initializing map...");
      
      // Create the map instance
      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [10.7522, 59.9139], // Default to Oslo
        zoom: 12,
        accessToken: mapboxToken // Pass token directly as well
      });
      
      map.current = mapInstance;
      
      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      console.log("Map created successfully");
      
      // Handle map load event
      mapInstance.on('load', () => {
        console.log("Map loaded successfully");
      });
      
      // Handle map error event
      mapInstance.on('error', (e) => {
        console.error("Map error:", e.error);
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }
    
    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken]);
  
  // Update map when user location is available
  useEffect(() => {
    if (!map.current || !userLocation) return;
    
    try {
      // Center the map on user location
      map.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 14,
        essential: true
      });
      
      // Add a marker for user location
      new mapboxgl.Marker({ color: '#FF0000' })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map.current);
        
      console.log("Added user marker at:", userLocation.latitude, userLocation.longitude);
    } catch (error) {
      console.error("Error updating map with user location:", error);
    }
  }, [userLocation]);
  
  // Center map on user
  const handleCenterOnUser = () => {
    if (!map.current || !userLocation) return;
    
    map.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 15,
      essential: true
    });
  };
  
  return (
    <div className="pb-16">
      <div className="map-container relative" style={{ height: 'calc(100vh - 6rem)' }}>
        {/* Map container */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
          {/* Map will be rendered here */}
        </div>
        
        {/* User's Position Button */}
        <Button 
          onClick={handleCenterOnUser}
          className="absolute bottom-20 right-4 bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white p-3 rounded-full shadow-lg z-10"
        >
          <ChevronDownIcon className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}