import { useState } from 'react';
import { SearchIcon, XIcon, Loader2Icon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LocationSearchProps {
  onResultsFound: (results: Array<{
    name: string;
    address?: string;
    coordinates: [number, number]; // [longitude, latitude]
    description?: string;
    type?: string;
  }>) => void;
}

export function LocationSearch({ onResultsFound }: LocationSearchProps) {
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Handle search submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchText.trim()) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Call the API to search for locations
      const response = await fetch('/api/openai/location-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchText }),
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        // Process the results
        onResultsFound(data.places);
      } else {
        setErrorMessage('No locations found. Try a more specific search.');
      }
    } catch (error) {
      console.error('Error searching for location:', error);
      setErrorMessage('Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchText('');
    setErrorMessage(null);
  };
  
  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="flex gap-1 p-2">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Search for a location..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 pr-8"
            disabled={isLoading}
          />
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          
          {searchText && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1.5 h-6 w-6 p-0 rounded-full"
              onClick={clearSearch}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button
          type="submit"
          variant="default"
          className="h-10"
          disabled={isLoading || !searchText.trim()}
        >
          {isLoading ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>
      
      {errorMessage && (
        <div className="px-2 py-1 text-xs text-red-500">
          {errorMessage}
        </div>
      )}
    </form>
  );
}