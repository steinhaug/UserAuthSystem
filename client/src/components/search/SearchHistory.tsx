import { useState } from 'react';
import { useSearchHistory } from '@/hooks/use-search-history';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, StarOff, Clock, MapPin, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface SearchHistoryProps {
  onSelectSearch?: (query: string) => void;
  className?: string;
  limit?: number;
}

export function SearchHistory({ 
  onSelectSearch, 
  className, 
  limit = 20 
}: SearchHistoryProps) {
  const [activeTab, setActiveTab] = useState('all');
  
  const { 
    history, 
    isLoadingHistory, 
    toggleFavorite, 
    performSearch 
  } = useSearchHistory(limit);
  
  const handleSearchClick = (query: string) => {
    performSearch(query, 'history_click');
    if (onSelectSearch) onSelectSearch(query);
  };
  
  // Filter history based on active tab
  const filteredHistory = history.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'favorites') return item.favorite;
    if (activeTab === 'map') return item.type === 'map_search';
    return true;
  });
  
  const renderSearches = () => {
    if (isLoadingHistory) {
      return Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border-b">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      ));
    }
    
    if (filteredHistory.length === 0) {
      return (
        <div className="p-6 text-center text-gray-500">
          {activeTab === 'favorites' 
            ? 'Ingen favoritterte søk ennå'
            : activeTab === 'map'
              ? 'Ingen kartsøk ennå'
              : 'Ingen søkehistorikk ennå'}
        </div>
      );
    }
    
    return filteredHistory.map(item => {
      const itemDate = new Date(item.timestamp);
      const timeAgo = formatDistanceToNow(itemDate, { addSuffix: true, locale: nb });
      
      return (
        <div 
          key={item.id} 
          className="group flex items-center justify-between p-3 border-b hover:bg-gray-50"
        >
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => handleSearchClick(item.query)}
          >
            <div className="font-medium">{item.query}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {item.type === 'map_search' && <MapPin className="h-3 w-3" />}
              <span>{timeAgo}</span>
              
              {item.category && (
                <Badge variant="outline" className="ml-2 text-xs py-0">
                  {item.category}
                </Badge>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="opacity-70 group-hover:opacity-100"
            onClick={() => toggleFavorite(item)}
          >
            {item.favorite ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
      );
    });
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Søkehistorikk</CardTitle>
        <CardDescription>
          Din tidligere søk og favoritter
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Alle</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>Favoritter</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>Kartsøk</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-4 px-0">
          <TabsContent value="all" className="m-0">
            {renderSearches()}
          </TabsContent>
          <TabsContent value="favorites" className="m-0">
            {renderSearches()}
          </TabsContent>
          <TabsContent value="map" className="m-0">
            {renderSearches()}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}