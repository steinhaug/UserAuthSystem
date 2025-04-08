import React, { useState } from 'react';
import { useSearchHistory } from '../../hooks/use-search-history';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  Star,
  MapPin,
  Navigation,
  Calendar,
  RefreshCw,
  Bookmark,
  Tag,
  Heart,
  Edit,
  Save,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SearchHistoryListProps {
  onSelectSearch: (query: string) => void;
  onSelectLocation?: (location: { latitude: string; longitude: string; name: string }) => void;
  className?: string;
}

export function SearchHistoryList({ onSelectSearch, onSelectLocation, className = '' }: SearchHistoryListProps) {
  const { 
    searchHistory,
    isHistoryLoading, 
    searchPreferences,
    isPreferencesLoading,
    addFavoriteLocation,
    addFavoriteCategory,
    updateSearchHistoryItem
  } = useSearchHistory();
  
  // State for editing search history tags and notes
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [newTag, setNewTag] = useState('');
  const [editedNotes, setEditedNotes] = useState('');

  if (isHistoryLoading || isPreferencesLoading) {
    return (
      <Card className={`${className} min-h-[200px] flex justify-center items-center`}>
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const hasSearchHistory = searchHistory && searchHistory.length > 0;
  const hasFavoriteLocations = searchPreferences?.favoriteLocations && Array.isArray(searchPreferences.favoriteLocations) && searchPreferences.favoriteLocations.length > 0;
  const hasFavoriteCategories = searchPreferences?.favoriteCategories && Array.isArray(searchPreferences.favoriteCategories) && searchPreferences.favoriteCategories.length > 0;
  
  if (!hasSearchHistory && !hasFavoriteLocations && !hasFavoriteCategories) {
    return (
      <Card className={`${className} min-h-[200px]`}>
        <CardHeader>
          <CardTitle>Search History</CardTitle>
          <CardDescription>Your search history will appear here</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Clock className="h-12 w-12 mb-2" />
          <p>No search history yet</p>
        </CardContent>
      </Card>
    );
  }

  // Format timestamp to a readable date
  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const isToday = new Date().toDateString() === date.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    
    if (isYesterday) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSaveLocation = (item: any) => {
    if (item.latitude && item.longitude) {
      addFavoriteLocation({
        name: item.query,
        latitude: item.latitude,
        longitude: item.longitude
      });
    }
  };

  const handleSaveCategory = (category: string) => {
    addFavoriteCategory(category);
  };
  
  // Handle adding and managing tags
  const handleStartEditing = (index: number, item: any) => {
    setEditingItem(index);
    setEditedNotes(item.notes || '');
  };
  
  const handleAddTag = (index: number, item: any) => {
    if (!newTag.trim()) return;
    
    const tags = Array.isArray(item.tags) ? [...item.tags] : [];
    if (!tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      updateSearchHistoryItem(item.id, { tags: updatedTags });
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (index: number, item: any, tagToRemove: string) => {
    if (!Array.isArray(item.tags)) return;
    
    const updatedTags = item.tags.filter((tag: string) => tag !== tagToRemove);
    updateSearchHistoryItem(item.id, { tags: updatedTags });
  };
  
  const handleSaveNotes = (index: number, item: any) => {
    updateSearchHistoryItem(item.id, { notes: editedNotes });
    setEditingItem(null);
  };
  
  const handleToggleFavorite = (item: any) => {
    updateSearchHistoryItem(item.id, { favorite: !item.favorite });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Your Search History</CardTitle>
        <CardDescription>Recent searches and saved locations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {hasFavoriteLocations && (
            <div>
              <div className="flex items-center mb-2">
                <Star className="h-4 w-4 mr-1 text-yellow-500" />
                <h3 className="text-sm font-semibold">Favorite Locations</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {Array.isArray(searchPreferences?.favoriteLocations) && searchPreferences.favoriteLocations.map((location, i: number) => (
                  <Button 
                    key={`fav-loc-${i}`}
                    variant="outline" 
                    className="justify-start py-1 px-2 h-auto"
                    onClick={() => onSelectLocation && onSelectLocation({
                      latitude: location.latitude,
                      longitude: location.longitude,
                      name: location.name
                    })}
                  >
                    <MapPin className="h-4 w-4 mr-2 text-primary" />
                    <span className="truncate">{location.name}</span>
                  </Button>
                ))}
              </div>
              <Separator className="my-2" />
            </div>
          )}

          {hasFavoriteCategories && (
            <div>
              <div className="flex items-center mb-2 mt-3">
                <Bookmark className="h-4 w-4 mr-1 text-primary" />
                <h3 className="text-sm font-semibold">Favorite Categories</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.isArray(searchPreferences?.favoriteCategories) && searchPreferences.favoriteCategories.map((category: string, i: number) => (
                  <Button 
                    key={`fav-cat-${i}`}
                    variant="secondary" 
                    size="sm"
                    className="h-7 rounded-full"
                    onClick={() => onSelectSearch(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <Separator className="my-2" />
            </div>
          )}

          {hasSearchHistory && (
            <div>
              <div className="flex items-center mb-2 mt-3">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Recent Searches</h3>
              </div>
              <div className="space-y-2">
                {searchHistory.map((item, i) => (
                  <div key={`history-${i}`} className={`${item.favorite ? 'bg-primary/10' : 'bg-muted/40'} rounded-lg p-2`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 p-0"
                          onClick={() => handleToggleFavorite(item)}
                        >
                          <Heart className={`h-4 w-4 ${item.favorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="p-0 h-auto font-medium text-left justify-start hover:bg-transparent"
                          onClick={() => onSelectSearch(item.query)}
                        >
                          {item.query}
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        {item.latitude && item.longitude && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7"
                                  onClick={() => handleSaveLocation(item)}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Save to favorite locations</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {item.category && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7"
                                  onClick={() => handleSaveCategory(item.category!)}
                                >
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Save category as favorite</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7"
                                onClick={() => handleStartEditing(i, item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add notes or tags</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    {/* Tags display */}
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag: string, tagIndex: number) => (
                          <Badge 
                            key={`tag-${tagIndex}`} 
                            variant="outline"
                            className="text-xs py-0 h-5"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                            {editingItem === i && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 ml-1 p-0"
                                onClick={() => handleRemoveTag(i, item, tag)}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Notes display */}
                    {item.notes && editingItem !== i && (
                      <div className="mt-1 text-xs text-muted-foreground bg-background/50 p-1 rounded">
                        {item.notes}
                      </div>
                    )}
                    
                    {/* Edit form */}
                    {editingItem === i && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <Input 
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add tag..."
                            className="h-8 text-xs"
                          />
                          <Button 
                            size="sm" 
                            className="h-8"
                            onClick={() => handleAddTag(i, item)}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        
                        <Input 
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          placeholder="Add notes..."
                          className="h-8 text-xs"
                        />
                        
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="h-7"
                            onClick={() => handleSaveNotes(i, item)}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatTimestamp(item.timestamp)}</span>
                      
                      {item.latitude && item.longitude && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-5 ml-2"
                          onClick={() => onSelectLocation && onSelectLocation({
                            latitude: item.latitude!,
                            longitude: item.longitude!,
                            name: item.query
                          })}
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          <span className="text-xs">Map</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}