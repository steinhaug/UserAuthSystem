import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { useSearchHistory } from "@/hooks/use-search-history";
import type { SearchHistory } from "@shared/schema";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  StarOff, 
  Clock, 
  Tag, 
  MapPin, 
  Search, 
  CheckCircle, 
  XCircle,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchHistoryListProps = {
  onSelectItem?: (query: string) => void;
  className?: string;
  limit?: number;
};

export function SearchHistoryList({ 
  onSelectItem, 
  className,
  limit = 10 
}: SearchHistoryListProps) {
  const { 
    history, 
    isLoadingHistory, 
    historyError, 
    updateSearchHistoryMutation,
    toggleFavorite: toggleFavoriteInHistory
  } = useSearchHistory(limit);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleFavorite = (id: number, currentValue: boolean) => {
    updateSearchHistoryMutation.mutate({
      id,
      data: { favorite: !currentValue }
    });
  };

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleItemClick = (item: SearchHistory) => {
    if (onSelectItem) {
      onSelectItem(item.query);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-3 pb-0">
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="p-3">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (historyError) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">
            Kunne ikke laste inn søkehistorikk
          </p>
          <Button variant="secondary" className="mt-2" size="sm">
            Prøv igjen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">
            Ingen søkehistorikk ennå
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Søk etter aktiviteter eller steder for å bygge opp din historikk
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {history.map((item: SearchHistory) => (
        <Card 
          key={item.id} 
          className={cn(
            "overflow-hidden transition-all hover:shadow-md", 
            item.favorite && "border-primary/30"
          )}
        >
          <CardHeader className="p-3 pb-1">
            <div className="flex justify-between items-center">
              <CardTitle 
                className="text-base font-medium line-clamp-1 cursor-pointer hover:underline" 
                onClick={() => handleItemClick(item)}
              >
                {item.query}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleFavorite(item.id, !!item.favorite)}
              >
                {item.favorite ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">Favorite</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(item.timestamp), { 
                  addSuffix: true,
                  locale: nb 
                })}
              </div>
              {item.category && (
                <div className="flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {item.category}
                </div>
              )}
              {item.latitude && item.longitude && (
                <div className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  Koordinater lagret
                </div>
              )}
              {item.resultCount !== undefined && (
                <Badge variant="outline" className="text-xs rounded-sm py-0 h-5">
                  {item.resultCount} resultat{item.resultCount !== 1 ? 'er' : ''}
                </Badge>
              )}
            </div>
            
            {expandedItems.has(item.id) && (
              <>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 my-2">
                    {item.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    {item.notes}
                  </p>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="p-2 pt-0 justify-between">
            <div className="flex items-center">
              {item.successful ? (
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className="text-xs text-muted-foreground">
                {item.successful ? 'Vellykket søk' : 'Mislykket søk'}
              </span>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => toggleExpanded(item.id)}
              >
                {expandedItems.has(item.id) ? 'Skjul' : 'Mer'}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => handleItemClick(item)}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}