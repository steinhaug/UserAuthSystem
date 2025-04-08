import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { 
  MapIcon, SunIcon, MoonIcon, MountainIcon, 
  LayersIcon, MapPinIcon, CrosshairIcon 
} from 'lucide-react';

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
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'satellite-streets' | 'light' | 'dark'>('streets');
  
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
  
  // State to track map loading status
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Function to get the style URL based on the selected style
  const getMapStyleUrl = (style: 'streets' | 'satellite' | 'satellite-streets' | 'light' | 'dark') => {
    return style === 'satellite' ? 'mapbox://styles/mapbox/satellite-v9' :
           style === 'satellite-streets' ? 'mapbox://styles/mapbox/satellite-streets-v12' :
           style === 'light' ? 'mapbox://styles/mapbox/light-v11' :
           style === 'dark' ? 'mapbox://styles/mapbox/dark-v11' :
           'mapbox://styles/mapbox/streets-v12'; // default streets style
  };
  
  // Handle map style change
  const changeMapStyle = (newStyle: 'streets' | 'satellite' | 'satellite-streets' | 'light' | 'dark') => {
    setMapStyle(newStyle);
    if (map.current) {
      map.current.setStyle(getMapStyleUrl(newStyle));
    }
  };
  
  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken) {
      console.error("Can't initialize map - either container is missing or no token is set");
      setMapError("Missing map container or invalid token");
      return;
    }
    
    try {
      console.log("Initializing map with token:", mapboxToken.substring(0, 5) + "...");
      
      // Get the right style based on mapStyle selection
      const styleUrl = getMapStyleUrl(mapStyle);
      
      // Create the map instance
      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
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
        setMapInitialized(true);
        setMapError(null);
      });
      
      // Handle map error event
      mapInstance.on('error', (e) => {
        console.error("Map error:", e.error);
        setMapError("Error loading map resources");
        
        // Try to diagnose token issues
        if (e.error && (e.error.message || "").includes("access token")) {
          setMapError("Invalid Mapbox access token");
        }
      });
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("Could not initialize map");
    }
    
    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken]);
  
  // State to hold active places near user
  const [nearbyPlaces] = useState([
    { name: "Coffee Shop", lat: 0, lng: 0, type: "cafe" },
    { name: "Restaurant", lat: 0, lng: 0, type: "restaurant" },
    { name: "Park", lat: 0, lng: 0, type: "park" },
    { name: "Gym", lat: 0, lng: 0, type: "gym" }
  ]);
  
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
      
      // Create a pulsing dot effect for user location
      const el = document.createElement('div');
      el.className = 'relative';
      
      const dot = document.createElement('div');
      dot.className = 'w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-white shadow-lg';
      dot.innerHTML = '<div class="w-4 h-4 rounded-full bg-primary animate-ping absolute"></div><div class="w-4 h-4 rounded-full bg-primary"></div>';
      
      el.appendChild(dot);
      
      // Add a marker for user location
      new mapboxgl.Marker(el)
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<strong>You are here</strong><br>Lat: ${userLocation.latitude.toFixed(4)}<br>Lng: ${userLocation.longitude.toFixed(4)}`))
        .addTo(map.current);
        
      console.log("Added user marker at:", userLocation.latitude, userLocation.longitude);
      
      // Add simulated nearby places based on user location
      nearbyPlaces.forEach((place, index) => {
        // Simulate locations around the user
        const offset = 0.002 + (index * 0.001);
        const lat = userLocation.latitude + (Math.random() > 0.5 ? offset : -offset);
        const lng = userLocation.longitude + (Math.random() > 0.5 ? offset : -offset);
        
        // Create marker element
        const placeEl = document.createElement('div');
        placeEl.className = 'place-marker';
        
        let markerHtml = '<div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white shadow-md">';
        
        // Different icons for different place types
        if (place.type === 'cafe') {
          markerHtml += '<span>☕</span>';
        } else if (place.type === 'restaurant') {
          markerHtml += '<span>🍽️</span>';
        } else if (place.type === 'park') {
          markerHtml += '<span>🌳</span>';
        } else if (place.type === 'gym') {
          markerHtml += '<span>💪</span>';
        }
        
        markerHtml += '</div>';
        placeEl.innerHTML = markerHtml;
        
        // Add marker to map
        new mapboxgl.Marker(placeEl)
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<strong>${place.name}</strong><br>Type: ${place.type}`))
          .addTo(map.current);
      });
      
    } catch (error) {
      console.error("Error updating map with user location:", error);
    }
  }, [userLocation, nearbyPlaces]);
  
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
        
        {/* Error message overlay */}
        {mapError && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 z-20">
            <div className="text-xl font-bold mb-2">Map Error</div>
            <p className="text-center mb-4">{mapError}</p>
            <div className="bg-red-900/50 p-4 rounded-lg max-w-md mb-4">
              <p className="text-sm text-center mb-2">
                <strong>Invalid Mapbox Token Detected!</strong>
              </p>
              <p className="text-sm text-center mb-2">
                Current token starts with: "{mapboxToken ? mapboxToken.substring(0, 4) + '...' : 'none'}" 
                and is {mapboxToken ? mapboxToken.length : 0} characters long.
              </p>
              <p className="text-sm text-center">
                A valid Mapbox token should start with "pk." and be approximately 80-90 characters long.
                Please set a valid token in your environment variables.
              </p>
            </div>
            
            {userLocation && (
              <div className="max-w-md text-center mt-2">
                <p className="mb-2">Your current location:</p>
                <div className="bg-black/40 p-2 rounded mb-4">
                  <p>Latitude: {userLocation.latitude.toFixed(6)}</p>
                  <p>Longitude: {userLocation.longitude.toFixed(6)}</p>
                </div>
                <a 
                  href={`https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  View on Google Maps
                </a>
              </div>
            )}
          </div>
        )}
        
        {/* Map Controls - only show if map initialized */}
        {!mapError && (
          <>
            {/* Map Style Panel */}
            <div className="absolute top-4 right-4 bg-white/90 rounded-lg shadow-lg p-2 z-10 flex flex-col gap-2">
              <div className="text-xs font-medium text-gray-700 mb-1 text-center">Map Style</div>
              <Button
                variant={mapStyle === 'streets' ? 'default' : 'outline'}
                size="sm"
                onClick={() => changeMapStyle('streets')}
                className="h-8 flex items-center gap-1"
                title="Streets View"
              >
                <MapIcon className="h-4 w-4" />
                <span className="text-xs">Streets</span>
              </Button>
              <Button
                variant={mapStyle === 'satellite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => changeMapStyle('satellite')}
                className="h-8 flex items-center gap-1"
                title="Satellite View"
              >
                <MountainIcon className="h-4 w-4" />
                <span className="text-xs">Satellite</span>
              </Button>
              <Button
                variant={mapStyle === 'satellite-streets' ? 'default' : 'outline'}
                size="sm"
                onClick={() => changeMapStyle('satellite-streets')}
                className="h-8 flex items-center gap-1"
                title="Satellite with Streets"
              >
                <LayersIcon className="h-4 w-4" />
                <span className="text-xs">Hybrid</span>
              </Button>
              <Button
                variant={mapStyle === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => changeMapStyle('light')}
                className="h-8 flex items-center gap-1"
                title="Light Mode"
              >
                <SunIcon className="h-4 w-4" />
                <span className="text-xs">Light</span>
              </Button>
              <Button
                variant={mapStyle === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => changeMapStyle('dark')}
                className="h-8 flex items-center gap-1"
                title="Dark Mode"
              >
                <MoonIcon className="h-4 w-4" />
                <span className="text-xs">Dark</span>
              </Button>
            </div>
            
            {/* User's Position Button */}
            <Button 
              onClick={handleCenterOnUser}
              className="absolute bottom-4 left-4 bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white p-3 rounded-full shadow-lg z-10"
              title="Center on my location"
            >
              <CrosshairIcon className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}