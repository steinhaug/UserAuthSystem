import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { CheckSquare, Square, MapPin, Compass, Clock, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SearchFilters {
  categories: string[];
  maxDistance?: number;
  sortBy: 'relevance' | 'distance' | 'newest';
  onlyWithPhotos?: boolean;
}

interface SearchFiltersProps {
  onFilterChange: (filters: SearchFilters) => void;
  availableCategories?: string[];
  className?: string;
}

export function SearchFilters({ onFilterChange, availableCategories = [], className = '' }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    maxDistance: 5,
    sortBy: 'relevance',
    onlyWithPhotos: false
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Common place type categories if none are provided
  const defaultCategories = [
    'Restaurant', 'Cafe', 'Park', 'Museum', 'Hotel', 
    'Shopping', 'Entertainment', 'Landmark', 'Sports'
  ];
  
  // Use provided categories or default ones
  const categories = availableCategories.length > 0 ? availableCategories : defaultCategories;

  // Toggle a category in the filter
  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    const newFilters = { ...filters, categories: newCategories };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Update distance filter
  const updateDistance = (value: number[]) => {
    const newFilters = { ...filters, maxDistance: value[0] };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Update sort method
  const updateSortBy = (method: 'relevance' | 'distance' | 'newest') => {
    const newFilters = { ...filters, sortBy: method };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Toggle photo filter
  const togglePhotoFilter = () => {
    const newFilters = { ...filters, onlyWithPhotos: !filters.onlyWithPhotos };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Get icon for sort method
  const getSortIcon = (method: 'relevance' | 'distance' | 'newest') => {
    switch (method) {
      case 'distance':
        return <MapPin className="h-4 w-4 mr-2" />;
      case 'newest':
        return <Clock className="h-4 w-4 mr-2" />;
      default:
        return <Compass className="h-4 w-4 mr-2" />;
    }
  };

  // Get label for sort method
  const getSortLabel = (method: 'relevance' | 'distance' | 'newest') => {
    switch (method) {
      case 'distance':
        return 'Nærmest';
      case 'newest':
        return 'Nyeste';
      default:
        return 'Mest relevant';
    }
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
                {filters.categories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.categories.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className="cursor-pointer"
                  >
                    {filters.categories.includes(category) ? (
                      <CheckSquare className="h-4 w-4 mr-2" />
                    ) : (
                      <Square className="h-4 w-4 mr-2" />
                    )}
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {getSortIcon(filters.sortBy)}
                {getSortLabel(filters.sortBy)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => updateSortBy('relevance')}
                className="cursor-pointer"
              >
                <Compass className="h-4 w-4 mr-2" />
                Mest relevant
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => updateSortBy('distance')}
                className="cursor-pointer"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Nærmest
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => updateSortBy('newest')}
                className="cursor-pointer"
              >
                <Clock className="h-4 w-4 mr-2" />
                Nyeste
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
        >
          {showFilterPanel ? 'Skjul' : 'Flere filtre'}
        </Button>
      </div>

      {showFilterPanel && (
        <div className="bg-muted/30 p-3 rounded-lg mb-3">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Maksimal avstand</span>
              <span className="text-sm text-muted-foreground">{filters.maxDistance} km</span>
            </div>
            <Slider
              defaultValue={[filters.maxDistance || 5]}
              max={20}
              min={1}
              step={1}
              onValueChange={updateDistance}
            />
          </div>

          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={togglePhotoFilter}
            >
              {filters.onlyWithPhotos ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              <span>Bare vis steder med bilder</span>
            </Button>
          </div>
        </div>
      )}

      {filters.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {filters.categories.map((category) => (
            <Badge 
              key={category} 
              variant="outline"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => toggleCategory(category)}
            >
              {category}
              <span className="ml-1">&times;</span>
            </Badge>
          ))}
          {filters.categories.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => {
                const newFilters = { ...filters, categories: [] };
                setFilters(newFilters);
                onFilterChange(newFilters);
              }}
            >
              Fjern alle
            </Button>
          )}
        </div>
      )}
    </div>
  );
}