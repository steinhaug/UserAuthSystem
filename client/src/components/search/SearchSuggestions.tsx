import { useState, useEffect } from 'react';
import { useSearchHistory } from '@/hooks/use-search-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Sparkles, TrendingUp } from 'lucide-react';

interface SearchSuggestionsProps {
  onSelectSuggestion?: (suggestion: string) => void;
  className?: string;
  title?: string;
  showTrending?: boolean;
  maxSuggestions?: number;
}

export function SearchSuggestions({
  onSelectSuggestion,
  className,
  title = 'Smarte søkeforslag',
  showTrending = true,
  maxSuggestions = 6
}: SearchSuggestionsProps) {
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const { performSearch } = useSearchHistory();
  
  // Generate smart suggestions based on trends, time of day, etc.
  // This is a simplified version - in a real app this might be server-driven
  useEffect(() => {
    const timeBasedSuggestions = () => {
      const hour = new Date().getHours();
      const suggestions: string[] = [];
      
      // Morning suggestions
      if (hour >= 6 && hour < 11) {
        suggestions.push('Morgentrening', 'Frokost-treff', 'Joggetur');
      }
      // Lunch suggestions
      else if (hour >= 11 && hour < 14) {
        suggestions.push('Lunsj-treff', 'Shopping-kompis', 'Kaffepauser');
      }
      // Afternoon suggestions
      else if (hour >= 14 && hour < 18) {
        suggestions.push('Ettermiddagstur', 'Studiegruppe', 'Fotball');
      }
      // Evening suggestions
      else {
        suggestions.push('Middag ute', 'Kveldstrening', 'Filmkveld');
      }
      
      // Add some general suggestions
      suggestions.push(
        'Friluftsliv', 
        'Sport og spill',
        'Spillkveld',
        'Konserter',
        'Mat & drikke',
        'Plogging'
      );
      
      // Shuffle array and return limited number
      return [...suggestions]
        .sort(() => 0.5 - Math.random())
        .slice(0, maxSuggestions);
    };
    
    setLocalSuggestions(timeBasedSuggestions());
  }, [maxSuggestions]);
  
  const handleSuggestionClick = (suggestion: string) => {
    performSearch(suggestion, 'suggestion_click');
    if (onSelectSuggestion) onSelectSuggestion(suggestion);
  };
  
  // Generate some trending suggestions
  const trendingSuggestions = [
    'Plogging', 
    'Kaffetreff', 
    'Konserter'
  ].slice(0, 3);
  
  const renderSuggestionButton = (suggestion: string, icon?: React.ReactNode) => (
    <Button
      key={suggestion}
      variant="outline"
      className="justify-start h-auto py-3 px-4 shadow-sm hover:shadow"
      onClick={() => handleSuggestionClick(suggestion)}
    >
      {icon || <Search className="h-4 w-4 mr-2 text-gray-400" />}
      <span>{suggestion}</span>
    </Button>
  );
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {showTrending && trendingSuggestions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>Populære søk</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {trendingSuggestions.map(suggestion => 
                renderSuggestionButton(suggestion, <TrendingUp className="h-4 w-4 mr-2 text-primary" />)
              )}
            </div>
          </div>
        )}
        
        <div>
          <h4 className="text-sm font-medium mb-2 text-gray-500">Forslag for deg</h4>
          
          {localSuggestions.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {localSuggestions.map(suggestion => 
                renderSuggestionButton(suggestion)
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}