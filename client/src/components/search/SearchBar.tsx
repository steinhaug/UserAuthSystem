import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchHistory } from '@/hooks/use-search-history';
import { Search, X, History, Star, StarOff } from 'lucide-react';
import { SearchHistory } from '@shared/schema';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  showHistory?: boolean;
  maxSuggestions?: number;
  onClear?: () => void;
}

export function SearchBar({
  placeholder = 'Søk...',
  onSearch,
  className,
  showHistory = true,
  maxSuggestions = 5,
  onClear
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    history,
    suggestions,
    searchQuery,
    handleSearchInputChange,
    performSearch,
    toggleFavorite
  } = useSearchHistory();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    performSearch(searchQuery);
    if (onSearch) onSearch(searchQuery);
    setIsOpen(false);
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    performSearch(suggestion, 'suggestion_click');
    if (onSearch) onSearch(suggestion);
    handleSearchInputChange(suggestion);
    setIsOpen(false);
  };
  
  const handleHistoryItemClick = (item: SearchHistory) => {
    performSearch(item.query, 'history_click');
    if (onSearch) onSearch(item.query);
    handleSearchInputChange(item.query);
    setIsOpen(false);
  };
  
  const handleClear = () => {
    handleSearchInputChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
    if (onClear) onClear();
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Filter and prepare suggestions
  const recentSearches = history
    .filter(item => item.favorite || item.type === 'history_click')
    .slice(0, maxSuggestions);
  
  const filteredSuggestions = suggestions
    .filter(suggestion => !recentSearches.some(item => item.query.toLowerCase() === suggestion.toLowerCase()))
    .slice(0, maxSuggestions);
  
  return (
    <div 
      ref={searchRef} 
      className={cn(
        "relative w-full max-w-md", 
        className
      )}
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onFocus={() => showHistory && setIsOpen(true)}
            className="pr-16 h-10 rounded-full bg-white border-gray-300 shadow-sm"
          />
          <div className="absolute right-0 top-0 h-full flex items-center">
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-full w-8 p-0"
              >
                <X className="h-4 w-4 text-gray-400" />
                <span className="sr-only">Tøm søk</span>
              </Button>
            )}
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-full w-9 p-0"
            >
              <Search className="h-4 w-4 text-gray-500" />
              <span className="sr-only">Søk</span>
            </Button>
          </div>
        </div>
      </form>
      
      {isOpen && (searchQuery || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md bg-white shadow-lg max-h-72 overflow-y-auto z-50 border border-gray-200">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1">
                <History className="h-3 w-3" />
                <span>Nylige søk</span>
              </div>
              <ul className="mt-1">
                {recentSearches.map((item) => (
                  <li key={item.id} className="px-1">
                    <div 
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleHistoryItemClick(item)}
                    >
                      <span>{item.query}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                      >
                        {item.favorite ? (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="h-3 w-3 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Live suggestions */}
          {searchQuery && filteredSuggestions.length > 0 && (
            <div className="p-2">
              {recentSearches.length > 0 && <div className="border-t border-gray-100 my-1"></div>}
              <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1">
                <Search className="h-3 w-3" />
                <span>Forslag</span>
              </div>
              <ul className="mt-1">
                {filteredSuggestions.map((suggestion, index) => (
                  <li key={index}>
                    <div 
                      className="py-1 px-3 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* No suggestions */}
          {searchQuery && filteredSuggestions.length === 0 && recentSearches.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              Ingen søkeforslag funnet
            </div>
          )}
        </div>
      )}
    </div>
  );
}