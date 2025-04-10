import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceSearch } from "@/components/map/VoiceSearch";
import { LocationSearch } from "@/components/map/LocationSearch";
import { NearMeNow } from "@/components/map/NearMeNow";
import { useSaveSearchHistory } from "@/hooks/use-search-history";
import { 
  MapIcon, SunIcon, MoonIcon, MountainIcon, 
  LayersIcon, MapPinIcon, CrosshairIcon,
  MicIcon, SearchIcon, CompassIcon
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
      
      // Legg til navigasjonskontroller - mindre størrelse med bare zoom-knapper
      // Vi bruker 'right' for å vise kontrollene på høyre side
      const navControl = new mapboxgl.NavigationControl({ 
        showCompass: false, // Vi viser bare zoom-knappene
        visualizePitch: false 
      });
      mapInstance.addControl(navControl, 'bottom-right');
      
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
  
  // State to hold active ploggers near user
  const [nearbyPloggers] = useState([
    { id: "plogger-1", lat: 0, lng: 0, type: "plogger", active: true, inBluetoothRange: false },
    { id: "plogger-2", lat: 0, lng: 0, type: "plogger", active: true, inBluetoothRange: true },
    { id: "plogger-3", lat: 0, lng: 0, type: "plogger", active: false, inBluetoothRange: false },
    { id: "plogger-4", lat: 0, lng: 0, type: "plogger", active: true, inBluetoothRange: true }
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
      
      // Add simulated nearby ploggers based on user location
      nearbyPloggers.forEach((plogger: { id: string; lat: number; lng: number; type: string; active: boolean; inBluetoothRange: boolean }, index: number) => {
        // Simulate locations around the user
        const offset = 0.002 + (index * 0.001);
        const lat = userLocation.latitude + (Math.random() > 0.5 ? offset : -offset);
        const lng = userLocation.longitude + (Math.random() > 0.5 ? offset : -offset);
        
        // Create marker element
        const ploggerEl = document.createElement('div');
        ploggerEl.className = 'plogger-marker';
        
        // Color based on activity status
        const bgColor = plogger.active ? 'bg-green-500' : 'bg-gray-400';
        
        // Plogger marker with trash bag icon
        const markerHtml = `
          <div class="w-10 h-10 rounded-full ${bgColor} text-white flex items-center justify-center border-2 border-white shadow-md relative">
            <span>🗑️</span>
            ${plogger.active ? '<div class="w-3 h-3 rounded-full bg-green-300 absolute -top-1 -right-1 border border-white animate-pulse"></div>' : ''}
          </div>
        `;
        
        ploggerEl.innerHTML = markerHtml;
        
        // Create HTML content for popup based on Bluetooth range status
        let popupHTML = '';
        
        if (plogger.inBluetoothRange) {
          // Within Bluetooth range - show full details
          const mockNames = ["Anna", "Markus", "Sofia", "Lars", "Johan", "Emma"];
          const mockName = mockNames[index % mockNames.length];
          const mockAge = 25 + (index * 2);
          
          popupHTML = `
            <div class="p-3">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                  <div class="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">${mockName.charAt(0)}</div>
                </div>
                <div>
                  <div class="font-medium">${mockName}, ${mockAge}</div>
                  <div class="text-xs text-blue-600 font-semibold">• Bluetooth-tilkobling</div>
                </div>
              </div>
              <div class="text-sm ${plogger.active ? 'text-green-600' : 'text-gray-500'}">
                ${plogger.active ? 'Aktiv plogger nå' : 'Inaktiv plogger'}
              </div>
              <div class="text-xs text-gray-500 mt-1">Sist aktiv: Idag, 10:45</div>
              <button class="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded">
                Start chat
              </button>
            </div>
          `;
        } else {
          // Outside Bluetooth range - anonymous view
          popupHTML = `
            <div class="p-3">
              <div class="flex flex-col items-center mb-2">
                <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-1">
                  <span class="text-lg">🗑️</span>
                </div>
                <div class="text-center">
                  <div class="font-medium">Anonym plogger</div>
                  <div class="text-xs text-gray-400">(utenfor Bluetooth-rekkevidde)</div>
                </div>
              </div>
              <div class="text-sm text-center ${plogger.active ? 'text-green-600' : 'text-gray-500'}">
                ${plogger.active ? 'Aktiv nå' : 'Inaktiv'}
              </div>
              <div class="text-xs text-center text-gray-500 mt-1">Beveg deg nærmere for å se profil</div>
            </div>
          `;
        }
        
        // Add marker to map
        if (map.current) {
          new mapboxgl.Marker(ploggerEl)
            .setLngLat([lng, lat])
            .setPopup(new mapboxgl.Popup({ offset: 25 })
              .setHTML(popupHTML))
            .addTo(map.current);
        }
      });
      
    } catch (error) {
      console.error("Error updating map with user location:", error);
    }
  }, [userLocation, nearbyPloggers]);
  
  // State for search results
  const [searchResults, setSearchResults] = useState<Array<{
    name: string;
    address?: string;
    coordinates: [number, number]; // [longitude, latitude]
    description?: string;
    type?: string;
  }>>([]);
  
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [showNearMeNow, setShowNearMeNow] = useState<'show' | 'hide'>(() => {
    // Try to get saved preference from localStorage
    const savedPreference = localStorage.getItem('nearMeNowPreference');
    return savedPreference === 'hide' ? 'hide' : 'show';
  });
  
  // Handle search for a location
  const handleLocationSearch = async (results: Array<{
    name: string;
    address?: string;
    coordinates: [number, number];
    description?: string;
    type?: string;
  }>) => {
    setSearchResults(results);
    
    if (results.length > 0 && map.current) {
      // Add markers for each result
      results.forEach((result, index) => {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'search-result-marker';
        
        // Style the marker with a number
        el.innerHTML = `<div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold border-2 border-white shadow-lg">${index + 1}</div>`;
        
        // Add marker to map
        if (map.current) {
          new mapboxgl.Marker(el)
            .setLngLat(result.coordinates)
            .setPopup(new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<strong>${result.name}</strong>${result.address ? `<br>${result.address}` : ''}${result.description ? `<br><span class="text-xs">${result.description}</span>` : ''}`))
            .addTo(map.current);
        }
      });
      
      // Fit map to show all results
      const bounds = new mapboxgl.LngLatBounds();
      results.forEach(result => {
        bounds.extend(result.coordinates);
      });
      
      // Add padding
      if (map.current) {
        map.current.fitBounds(bounds, {
          padding: 100,
          maxZoom: 15
        });
      }
    }
  };
  
  // Handle a search query from voice or text
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/openai/location-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        handleLocationSearch(data.places);
      }
    } catch (error) {
      console.error('Error searching for location:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Center map on user
  const handleCenterOnUser = () => {
    if (!map.current || !userLocation) return;
    
    map.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 15,
      essential: true
    });
  };
  
  // Handle direct location selection from search history
  const handleDirectLocation = (location: { latitude: string; longitude: string; name: string }) => {
    if (!map.current) return;
    
    // Convert string coordinates to numbers
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.error("Invalid coordinates:", location);
      return;
    }
    
    // Clear existing search results
    setSearchResults([]);
    
    // Create a marker for the location
    const el = document.createElement('div');
    el.className = 'history-location-marker';
    el.innerHTML = `<div class="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold border-2 border-white shadow-lg">📍</div>`;
    
    // Add marker to map
    if (map.current) {
      new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<strong>${location.name}</strong>`))
        .addTo(map.current);
    }
    
    // Fly to the location
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true
      });
    }
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
            
            {/* Search controls */}
            <div className="absolute top-4 left-4 z-10 w-full max-w-md px-4">
              <div className="bg-white/90 rounded-lg shadow-lg overflow-hidden">
                {/* Location search */}
                <div className="relative">
                  <LocationSearch 
                    onSearch={handleSearch}
                  />
                  
                  {/* Voice search button */}
                  <div className="absolute right-16 top-3">
                    <VoiceSearch 
                      onSearch={handleSearch}
                      isSearching={isSearching}
                    />
                  </div>
                </div>
              </div>
              
              {/* Search results list */}
              {searchResults.length > 0 && (
                <div className="bg-white/90 rounded-lg shadow-lg mt-2 max-h-72 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {searchResults.map((result, index) => (
                      <li 
                        key={index}
                        className={`p-3 hover:bg-gray-100 cursor-pointer ${selectedLocation === index ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          setSelectedLocation(index);
                          if (map.current) {
                            map.current.flyTo({
                              center: result.coordinates,
                              zoom: 16,
                              essential: true
                            });
                          }
                        }}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">{result.name}</h4>
                            {result.address && <p className="text-xs text-gray-500">{result.address}</p>}
                            {result.type && <p className="text-xs text-gray-400">{result.type}</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Near Me Now suggestions with side tab to show/hide */}
              {!searchResults.length && (
                <div className="mt-2 relative">
                  {/* Vertical tab at left side */}
                  <button
                    onClick={() => {
                      const newValue = showNearMeNow === 'show' ? 'hide' : 'show';
                      setShowNearMeNow(newValue as 'show' | 'hide');
                      localStorage.setItem('nearMeNowPreference', newValue);
                    }}
                    className={`absolute -right-8 top-8 transform rotate-90 origin-top-left bg-white/90 text-xs font-medium px-2 py-1 rounded-t-lg shadow-md ${
                      showNearMeNow === 'show' ? 'text-primary' : 'text-gray-500'
                    }`}
                    title={showNearMeNow === 'show' ? 'Skjul nærhetspanel' : 'Vis nærhetspanel'}
                  >
                    {showNearMeNow === 'show' ? '▼ Nærhet' : '▲ Nærhet'}
                  </button>
                  
                  {/* Content shows only when tab value is 'show' */}
                  {showNearMeNow === 'show' && (
                    <div className="animate-in fade-in duration-300">
                      <NearMeNow 
                        currentLocation={userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : undefined}
                        onSelectPlace={(place) => {
                          if (place.name && map.current && userLocation) {
                            // Create a search for this place
                            handleSearch(place.name);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
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