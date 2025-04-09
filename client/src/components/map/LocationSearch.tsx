import React, { useState, useRef, useEffect } from "react";
import { Loader2, Search, History, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { 
  useSearchSuggestions, 
  useNearbySearchSuggestions, 
  useSaveSearchHistory 
} from "@/hooks/use-search-history";
import { SearchHistoryList } from "./SearchHistoryList";

interface LocationSearchProps {
  onSearch: (query: string) => void;
  initialValue?: string;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function LocationSearch({
  onSearch,
  initialValue = "",
  className = "",
  placeholder = "Søk etter aktiviteter, steder eller personer...",
  autoFocus = false
}: LocationSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: suggestions = [], isLoading: suggestionsLoading } = useSearchSuggestions(
    query.length > 1 ? query : ""
  );
  
  const { data: nearbySuggestions = [], isLoading: nearbyLoading } = useNearbySearchSuggestions();
  const saveSearchMutation = useSaveSearchHistory();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!query.trim()) return;
    
    // Save search to history
    saveSearchMutation.mutate({
      query: query.trim()
    });
    
    // Execute search
    onSearch(query.trim());
    setIsOpen(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    
    // Save search to history
    saveSearchMutation.mutate({
      query: suggestion
    });
    
    // Execute search
    onSearch(suggestion);
    setIsOpen(false);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    
    // Save search to history
    saveSearchMutation.mutate({
      query: historyQuery
    });
    
    // Execute search
    onSearch(historyQuery);
    setShowHistory(false);
  };

  return (
    <div className={className}>
      <div className="relative">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pr-24"
            autoFocus={autoFocus}
            onFocus={() => setIsOpen(true)}
          />
          <div className="absolute right-0 top-0 flex h-full items-center gap-1 pr-2">
            {query && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Tøm søk</span>
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
              <span className="sr-only">Søkehistorikk</span>
            </Button>
            <Button type="submit" size="icon" variant="ghost" className="h-7 w-7">
              <Search className="h-4 w-4" />
              <span className="sr-only">Søk</span>
            </Button>
          </div>
        </form>

        {showHistory && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            <div className="max-h-80 overflow-y-auto p-2">
              <SearchHistoryList 
                onSelectItem={handleHistoryClick} 
                limit={5}
              />
            </div>
          </div>
        )}
      </div>

      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput 
          placeholder="Søk etter aktiviteter, steder eller personer..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length > 0 ? (
              "Ingen forslag funnet"
            ) : (
              "Begynn å skrive for å søke"
            )}
          </CommandEmpty>

          {query.length > 0 && suggestions.length > 0 && (
            <CommandGroup heading="Forslag">
              {suggestionsLoading ? (
                <CommandItem disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Laster forslag...</span>
                </CommandItem>
              ) : (
                suggestions.map((suggestion: string, index: number) => (
                  <CommandItem 
                    key={`suggestion-${index}`}
                    onSelect={() => {
                      handleSuggestionClick(suggestion);
                      return suggestion;
                    }}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <span>{suggestion}</span>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          )}

          {nearbySuggestions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="I nærheten">
                {nearbyLoading ? (
                  <CommandItem disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Laster steder i nærheten...</span>
                  </CommandItem>
                ) : (
                  nearbySuggestions.map((suggestion: string, index: number) => (
                    <CommandItem 
                      key={`nearby-${index}`}
                      onSelect={() => {
                        handleSuggestionClick(suggestion);
                        return suggestion;
                      }}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{suggestion}</span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup>
            <CommandItem 
              onSelect={() => {
                handleSubmit();
                return query;
              }}
              className="justify-center text-center"
            >
              <span>Søk etter "{query}"</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}