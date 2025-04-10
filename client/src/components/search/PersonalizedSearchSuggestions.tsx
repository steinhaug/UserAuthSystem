import { useState, useEffect } from 'react';
import { usePersonalizedSuggestions } from '@/hooks/use-search-history';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Star, 
  Activity, 
  Brain,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface PersonalizedSearchSuggestionsProps {
  onSelectSuggestion?: (suggestion: string) => void;
  className?: string;
  title?: string;
  maxSuggestions?: number;
}

export function PersonalizedSearchSuggestions({
  onSelectSuggestion,
  className,
  title = 'Smarte søkeforslag',
  maxSuggestions = 10
}: PersonalizedSearchSuggestionsProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [hasRealtimeData, setHasRealtimeData] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'initializing'>('initializing');
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const { 
    data: personalizedData, 
    isLoading, 
    error,
    offlineMode,
    realtimeConnected 
  } = usePersonalizedSuggestions(maxSuggestions);
  
  // Use the connection state from the hook
  useEffect(() => {
    // Update the component state based on the hook's connection state
    setRealtimeStatus(realtimeConnected ? 'connected' : 'disconnected');
    
    if (realtimeConnected) {
      setHasRealtimeData(true);
    }
  }, [realtimeConnected]);
  
  const handleSuggestionClick = (suggestion: string) => {
    if (onSelectSuggestion) onSelectSuggestion(suggestion);
  };
  
  // Function to render a suggestion button
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
  
  // If loading, show skeletons
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If error, show error message
  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Kunne ikke laste inn søkeforslag</p>
        </CardContent>
      </Card>
    );
  }
  
  // Get the suggestions we want to display based on the active tab
  const getSuggestionsForActiveTab = () => {
    if (!personalizedData) return [];
    
    switch (activeTab) {
      case 'all':
        return personalizedData.suggestions;
      case 'trending':
        return personalizedData.categories.trending;
      case 'time':
        return personalizedData.categories.timeBased;
      case 'favorites':
        return personalizedData.categories.favorites;
      case 'preferences':
        return personalizedData.categories.preferences;
      case 'smart':
        return personalizedData.categories.smart || [];
      default:
        return personalizedData.suggestions;
    }
  };
  
  const tabIcon = (tab: string) => {
    switch (tab) {
      case 'all':
        return <Sparkles className="h-4 w-4 mr-1" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4 mr-1" />;
      case 'time':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'favorites':
        return <Star className="h-4 w-4 mr-1" />;
      case 'preferences':
        return <Brain className="h-4 w-4 mr-1" />;
      case 'smart':
        return <Activity className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };
  
  const displaySuggestions = getSuggestionsForActiveTab();
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
          {realtimeStatus === 'connected' ? (
            <Badge variant="outline" className="ml-2 gap-1 px-1.5">
              <Wifi className="h-3 w-3 text-green-500" />
              <span className="text-xs">Sanntid</span>
            </Badge>
          ) : realtimeStatus === 'disconnected' ? (
            <Badge variant="outline" className="ml-2 gap-1 px-1.5 bg-amber-50">
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span className="text-xs">Offline</span>
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          <div className="flex items-center text-xs text-muted-foreground">
            {realtimeStatus === 'connected' ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                Sanntidsdata aktiv
              </>
            ) : realtimeStatus === 'disconnected' ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2"></span>
                Bruker lokal database
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                Initialiserer sanntidsdata...
              </>
            )}
          </div>
          
          {realtimeStatus === 'disconnected' && (
            <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Jobber i frakoblet modus. Forslag kan være utdaterte.</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="all" className="flex items-center gap-1">
              {tabIcon('all')}
              <span className="hidden sm:inline">Alle</span>
            </TabsTrigger>
            <TabsTrigger value="smart" className="flex items-center gap-1">
              {tabIcon('smart')}
              <span className="hidden sm:inline">Smart</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-1">
              {tabIcon('trending')}
              <span className="hidden sm:inline">Populært</span>
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1">
              {tabIcon('time')}
              <span className="hidden sm:inline">Tidspunkt</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1">
              {tabIcon('favorites')}
              <span className="hidden sm:inline">Favoritter</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-1">
              {tabIcon('preferences')}
              <span className="hidden sm:inline">For deg</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {displaySuggestions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {activeTab === 'favorites' 
              ? 'Ingen favoritterte søk ennå'
              : activeTab === 'preferences'
                ? 'Ingen personaliserte søk ennå'
                : 'Ingen forslag tilgjengelig'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displaySuggestions.map((suggestion: string) => 
              renderSuggestionButton(
                suggestion,
                activeTab === 'trending' ? <TrendingUp className="h-4 w-4 mr-2 text-primary" /> :
                activeTab === 'time' ? <Clock className="h-4 w-4 mr-2 text-primary" /> :
                activeTab === 'favorites' ? <Star className="h-4 w-4 mr-2 text-primary" /> :
                activeTab === 'preferences' ? <Brain className="h-4 w-4 mr-2 text-primary" /> :
                activeTab === 'smart' ? <Activity className="h-4 w-4 mr-2 text-primary" /> :
                <Search className="h-4 w-4 mr-2 text-gray-400" />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}