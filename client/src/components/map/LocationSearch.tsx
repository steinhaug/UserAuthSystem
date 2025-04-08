import { useState, useEffect, useRef } from 'react';
import { SearchIcon, XIcon, Loader2Icon, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchHistory } from '../../hooks/use-search-history';
import { SearchHistoryList } from './SearchHistoryList';

interface LocationSearchProps {
  onResultsFound: (results: Array<{
    name: string;
    address?: string;
    coordinates: [number, number]; // [longitude, latitude]
    description?: string;
    type?: string;
  }>) => void;
  onDirectLocation?: (location: { latitude: string; longitude: string; name: string }) => void;
}

export function LocationSearch({ onResultsFound, onDirectLocation }: LocationSearchProps) {
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    getSuggestions, 
    saveSearch, 
    updateLastLocation
  } = useSearchHistory();

  useEffect(() => {
    // Get search suggestions when search text changes
    if (searchText.trim().length > 1) {
      const fetchSuggestions = async () => {
        const fetchedSuggestions = await getSuggestions(searchText.trim());
        setSuggestions(fetchedSuggestions);
      };
      
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchText, getSuggestions]);
  
  // Handle search submission
  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    
    const query = overrideQuery || searchText;
    if (!query.trim()) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    setShowSuggestions(false);
    
    try {
      // Call the API to search for locations
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
        // Process the results
        onResultsFound(data.places);
        
        // Save search to history
        const firstPlace = data.places[0];
        saveSearch({
          query,
          latitude: firstPlace.coordinates[1].toString(),
          longitude: firstPlace.coordinates[0].toString(),
          category: firstPlace.type || undefined,
          resultCount: data.places.length,
          successful: true
        });
        
        // Update last location in preferences
        updateLastLocation({
          latitude: firstPlace.coordinates[1].toString(),
          longitude: firstPlace.coordinates[0].toString()
        });
        
        // Update the search text if we used an override
        if (overrideQuery) {
          setSearchText(overrideQuery);
        }
      } else {
        setErrorMessage('No locations found. Try a more specific search.');
        
        // Save failed search to history
        saveSearch({
          query,
          successful: false
        });
      }
    } catch (error) {
      console.error('Error searching for location:', error);
      setErrorMessage('Failed to search. Please try again.');
      
      // Save failed search to history
      saveSearch({
        query,
        successful: false
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchText('');
    setErrorMessage(null);
    setShowSuggestions(false);
  };
  
  // Handle selecting a suggestion
  const handleSelectSuggestion = (suggestion: string) => {
    setShowSuggestions(false);
    handleSearch(undefined, suggestion);
  };

  // Handle direct location selection from history
  const handleSelectLocation = (location: { latitude: string; longitude: string; name: string }) => {
    if (onDirectLocation) {
      onDirectLocation(location);
      setShowHistory(false);
    }
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    if (searchText.trim().length > 1) {
      setShowSuggestions(true);
    }
  };

  return (
    <>
      <form onSubmit={handleSearch} className="relative">
        <div className="flex gap-1 p-2">
          <div className="relative flex-grow">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search for a location..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                if (e.target.value.trim().length > 1) {
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={handleInputFocus}
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
          
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            type="button"
            onClick={() => setShowHistory(true)}
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
        
        {errorMessage && (
          <div className="px-2 py-1 text-xs text-red-500">
            {errorMessage}
          </div>
        )}
      </form>

      {/* Suggestions popover */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full z-50 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 text-sm font-medium text-gray-500">Search Suggestions</div>
          <ul className="divide-y divide-gray-100">
            {suggestions.map((suggestion, index) => (
              <li
                key={`suggestion-${index}`}
                className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <Clock className="mr-2 h-4 w-4 text-gray-500" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History dialog */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-medium">Search History</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <SearchHistoryList 
                onSelectSearch={(query) => {
                  handleSearch(undefined, query);
                  setShowHistory(false);
                }}
                onSelectLocation={(location) => {
                  handleSelectLocation(location);
                  setShowHistory(false);
                }}
                className="border-none shadow-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}