import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Compass, MapPin, Loader2, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '../../contexts/AuthContext';

interface NearMeSuggestion {
  name: string;
  type: string;
  description: string;
  distance: string;
}

interface NearMeNowProps {
  onSelectPlace?: (place: { name: string; description?: string; type?: string }) => void;
  currentLocation?: { latitude: number; longitude: number };
  className?: string;
}

export function NearMeNow({ onSelectPlace, currentLocation, className = '' }: NearMeNowProps) {
  const [suggestions, setSuggestions] = useState<NearMeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Function to fetch nearby suggestions
  const fetchNearbySuggestions = async () => {
    if (!currentLocation || !isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch suggestions from the API
      const response = await fetch(
        `/api/search/near-me?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}&radius=2`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch nearby suggestions: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Error fetching nearby suggestions:', err);
      setError('Could not load nearby suggestions. Please try again later.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch suggestions when the component mounts or location changes
  useEffect(() => {
    if (currentLocation) {
      fetchNearbySuggestions();
    }
  }, [currentLocation, isAuthenticated]);

  // Handle selecting a place
  const handleSelectPlace = (place: NearMeSuggestion) => {
    if (onSelectPlace) {
      onSelectPlace({
        name: place.name,
        description: place.description,
        type: place.type
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className={`${className} min-h-[200px]`}>
        <CardHeader>
          <CardTitle>Discover Nearby</CardTitle>
          <CardDescription>Sign in to discover interesting places near you</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Compass className="h-12 w-12 mb-2" />
          <p>Login required</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentLocation) {
    return (
      <Card className={`${className} min-h-[200px]`}>
        <CardHeader>
          <CardTitle>Discover Nearby</CardTitle>
          <CardDescription>Enable location to discover interesting places near you</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <MapPin className="h-12 w-12 mb-2" />
          <p>Location needed</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={`${className} min-h-[200px] flex flex-col justify-center items-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground">Finding nearby places...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} min-h-[200px]`}>
        <CardHeader>
          <CardTitle>Discover Nearby</CardTitle>
          <CardDescription>Could not load suggestions</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Info className="h-12 w-12 mb-2 text-red-500" />
          <p className="text-center">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={fetchNearbySuggestions}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (suggestions.length === 0) {
    return (
      <Card className={`${className} min-h-[200px]`}>
        <CardHeader>
          <CardTitle>Discover Nearby</CardTitle>
          <CardDescription>No interesting places found nearby</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Compass className="h-12 w-12 mb-2" />
          <p>Try again in a different location</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={fetchNearbySuggestions}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Compass className="h-5 w-5 mr-2 text-primary" />
          <span>Near Me Now</span>
        </CardTitle>
        <CardDescription>Interesting places within 2km of your location</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {suggestions.map((place, i) => (
              <div 
                key={`nearby-${i}`} 
                className="bg-muted/40 rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSelectPlace(place)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{place.name}</h3>
                  <span className="text-xs text-muted-foreground">{place.distance}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="inline-block bg-primary/10 text-primary text-xs py-0.5 px-2 rounded-full">{place.type}</span>
                </div>
                <p className="text-sm mt-2 line-clamp-2">{place.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={fetchNearbySuggestions}
            >
              <MapPin className="h-3 w-3 mr-1" />
              Refresh Nearby Places
            </Button>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}