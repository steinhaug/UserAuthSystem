import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { InsertSearchHistory, SearchHistory } from '@shared/schema';


import { apiRequest } from '@/lib/queryClient';

// Define response types for better type checking
interface SuggestionsResponse {
  suggestions: string[];
}

interface SearchHistoryResponse {
  searchHistory: SearchHistory;
}

interface HistoryResponse {
  history: SearchHistory[];
}

interface PersonalizedSuggestionsResponse {
  suggestions: string[];
  trending: string[];
  categories: {
    favorites: string[];
    timeBased: string[];
    trending: string[];
    preferences: string[];
    smart?: string[];
  };
}

interface HistoryItemResponse {
  history: SearchHistory;
}

export type SearchSuggestion = string;

// Hook for getting search suggestions based on query
export const useSearchSuggestions = (query: string = "") => {
  return useQuery({
    queryKey: ['/api/search/suggestions', query],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return [] as SearchSuggestion[];
      }
      const data = await apiRequest(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      return (data as unknown as SuggestionsResponse).suggestions || [];
    },
    enabled: query.length >= 2 // Only fetch if user has typed at least 2 characters
  });
};

// Hook for getting nearby search suggestions
export const useNearbySearchSuggestions = () => {
  return useQuery({
    queryKey: ['/api/search/nearby'],
    queryFn: async () => {
      const data = await apiRequest('/api/search/nearby');
      return (data as unknown as SuggestionsResponse).suggestions || [];
    }
  });
};

// Hook for getting personalized search suggestions based on user history and preferences
export const usePersonalizedSuggestions = (limit: number = 10) => {
  const { currentUser } = useAuth();
  const [firebaseData, setFirebaseData] = useState<PersonalizedSuggestionsResponse | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState<PersonalizedSuggestionsResponse | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isGeneratingSmartSuggestions, setIsGeneratingSmartSuggestions] = useState(false);
  
  // Query for user search history to generate smart suggestions
  const { data: historyData } = useQuery({
    queryKey: ['/api/search/history', 50], // Get more history items for better suggestions
    queryFn: async () => {
      try {
        const data = await apiRequest(`/api/search/history?limit=50`);
        return (data as unknown as { history: SearchHistory[] }).history || [];
      } catch (error) {
        console.error('Error fetching search history for smart suggestions:', error);
        return [];
      }
    }
  });
  
  // Query for user preferences
  const { data: preferencesData } = useQuery({
    queryKey: ['/api/search/preferences'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/search/preferences');
        return data;
      } catch (error) {
        console.error('Error fetching search preferences:', error);
        return null;
      }
    }
  });
  
  // Generate smart suggestions based on user history and preferences
  useEffect(() => {
    const generateSuggestions = async () => {
      if (!historyData || historyData.length === 0) return;
      
      try {
        setIsGeneratingSmartSuggestions(true);
        
        // Import smart search engine functionality
        const { 
          generateSmartSuggestions, 
          identifyTrendingPatterns 
        } = await import('@/lib/smartSearchEngine');
        
        // Generate suggestions
        const smartSuggestions = generateSmartSuggestions(
          historyData,
          preferencesData,
          Math.max(10, limit)
        );
        
        // Generate trending suggestions
        const trendingSuggestions = identifyTrendingPatterns(
          historyData
        );
        
        // Extract just the query strings and combine
        const combinedSuggestions = [
          ...smartSuggestions,
          ...trendingSuggestions
        ]
          .sort((a, b) => b.score - a.score)
          .map(suggestion => suggestion.query)
          // Remove duplicates
          .filter((suggestion, index, self) => 
            self.findIndex(s => s === suggestion) === index
          )
          .slice(0, limit);
        
        setSmartSuggestions(combinedSuggestions);
      } catch (error) {
        console.error('Error generating smart suggestions:', error);
      } finally {
        setIsGeneratingSmartSuggestions(false);
      }
    };
    
    generateSuggestions();
  }, [historyData, preferencesData, limit]);
  
  // Load local suggestions and check connection status
  useEffect(() => {
    const checkConnectionAndLoadLocal = async () => {
      try {
        // Import Firebase search functions dynamically
        const { isRealtimeConnected } = await import('@/lib/firebaseSearch');
        
        // Check connection status
        const connected = await isRealtimeConnected();
        setRealtimeConnected(connected);
        setOfflineMode(!connected);
        
        // Try to load cached suggestions from localStorage
        if (!connected) {
          try {
            // Attempt to load cached suggestions from localStorage directly
            const cachedData = localStorage.getItem('personalized_suggestions');
            if (cachedData) {
              try {
                const cached = JSON.parse(cachedData);
                setLocalSuggestions(cached);
              } catch (e) {
                console.error('Error parsing cached suggestions:', e);
              }
            }
          } catch (err) {
            console.error('Error loading local suggestions:', err);
          }
        }
      } catch (error) {
        console.error('Error checking realtime connection:', error);
        setOfflineMode(true);
        setRealtimeConnected(false);
      }
    };
    
    checkConnectionAndLoadLocal();
  }, []);
  
  // Server-side personalized suggestions
  const serverQuery = useQuery<PersonalizedSuggestionsResponse>({
    queryKey: ['/api/search/personalized', limit],
    queryFn: async () => {
      try {
        // Using fetch directly to avoid typing issues
        const response = await fetch(`/api/search/personalized?limit=${limit}`, {
          credentials: "include",
          headers: {
            "X-Dev-Mode": "true" // Add development mode header
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch personalized suggestions: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Also cache the data locally for offline use
        try {
          // Cache directly to localStorage
          localStorage.setItem('personalized_suggestions', JSON.stringify(data));
        } catch (error) {
          console.error('Error caching suggestions:', error);
        }
        
        return data as PersonalizedSuggestionsResponse;
      } catch (error) {
        console.error('Error fetching personalized suggestions:', error);
        
        // If offline, try to use cached data
        if (localSuggestions) {
          return localSuggestions;
        }
        
        return {
          suggestions: [],
          trending: [],
          categories: {
            favorites: [],
            timeBased: [],
            trending: [],
            preferences: []
          }
        };
      }
    }
  });
  
  // Use Firebase Realtime Database for real-time suggestions
  useEffect(() => {
    if (!currentUser?.uid || !realtimeConnected) return;
    
    // Import Firebase search functions dynamically to avoid SSR issues
    import('@/lib/firebaseSearch').then(({ listenToPersonalizedSuggestions }) => {
      // Set up real-time listener
      const unsubscribe = listenToPersonalizedSuggestions(currentUser.uid, (data) => {
        setFirebaseData(data);
        
        // Also cache the data locally
        try {
          localStorage.setItem('personalized_suggestions', JSON.stringify(data));
        } catch (error) {
          console.error('Error caching suggestions from Firebase:', error);
        }
      });
      
      // Clean up listener on unmount
      return () => unsubscribe();
    });
  }, [currentUser?.uid, realtimeConnected]);
  
  // Combine server data with Firebase data and smart suggestions
  const data = useMemo(() => {
    // Start with Firebase data if available, otherwise server data
    let baseData = firebaseData || serverQuery.data;
    
    // If offline and no Firebase data, use local data
    if (!baseData && offlineMode && localSuggestions) {
      baseData = localSuggestions;
    }
    
    // If we still don't have data, use empty state
    if (!baseData) {
      baseData = {
        suggestions: [],
        trending: [],
        categories: {
          favorites: [],
          timeBased: [],
          trending: [],
          preferences: []
        }
      };
    }
    
    // If we have smart suggestions, integrate them
    if (smartSuggestions.length > 0) {
      // Create a new object to avoid mutating the base data
      return {
        ...baseData,
        // Add smart suggestions to the main suggestions list
        suggestions: [
          ...smartSuggestions,
          ...baseData.suggestions
        ]
          // Remove duplicates
          .filter((suggestion, index, self) => 
            self.indexOf(suggestion) === index
          )
          .slice(0, limit),
        // Add a new categories.smart field
        categories: {
          ...baseData.categories,
          smart: smartSuggestions.slice(0, Math.min(5, limit))
        }
      };
    }
    
    return baseData;
  }, [firebaseData, serverQuery.data, offlineMode, localSuggestions, smartSuggestions, limit]);
  
  return {
    ...serverQuery,
    data,
    isLoading: (serverQuery.isLoading && !firebaseData && !localSuggestions) || isGeneratingSmartSuggestions,
    offlineMode,
    realtimeConnected,
    hasSmartSuggestions: smartSuggestions.length > 0
  };
};

// Hook for saving search history
export const useSaveSearchHistory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  return useMutation({
    mutationFn: async (searchData: Omit<InsertSearchHistory, 'userId'>) => {
      // First, save to the server
      const data = await apiRequest('/api/search/save', {
        method: 'POST',
        data: searchData
      });
      
      // Then, save to Firebase Realtime Database if user is authenticated
      if (currentUser?.uid) {
        // Import dynamically to avoid SSR issues
        try {
          const { saveSearchToFirebase } = await import('@/lib/firebaseSearch');
          await saveSearchToFirebase(searchData, currentUser.uid);
        } catch (error) {
          console.error('Error saving search to Firebase:', error);
          // We don't throw the error here to avoid interrupting the user experience
          // The server save was successful, so we consider this a non-critical error
        }
      }
      
      return (data as unknown as SearchHistoryResponse).searchHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
      // Also invalidate personalized suggestions to refresh them with new search data
      queryClient.invalidateQueries({ queryKey: ['/api/search/personalized'] });
    },
    onError: (error) => {
      toast({
        title: 'Feil',
        description: `Kunne ikke lagre søket: ${error.message}`,
        variant: 'destructive'
      });
    }
  });
};

export const useSearchHistory = (limit: number = 10) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [firebaseHistory, setFirebaseHistory] = useState<SearchHistory[] | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [syncingToFirebase, setSyncingToFirebase] = useState(false);
  const { currentUser } = useAuth();

  // This state will be used for the server history when available
  const [localHistory, setLocalHistory] = useState<SearchHistory[]>([]);
  const [offlineMode, setOfflineMode] = useState(false);
  
  // Use development mode constant
  const DEVELOPMENT_MODE = process.env.NODE_ENV === 'development';
  
  // Load local history from storage if available
  useEffect(() => {
    const loadLocalHistory = async () => {
      if (DEVELOPMENT_MODE) return;
      
      try {
        const { getLocalSearchHistory } = await import('@/lib/firebaseSearch');
        const { items, timestamp } = getLocalSearchHistory();
        if (items.length > 0) {
          setLocalHistory(items);
        }
      } catch (error) {
        console.error('Error loading local history:', error);
      }
    };
    
    loadLocalHistory();
  }, []);
  
  // Check Firebase Realtime Database connection status and set up auto-sync
  useEffect(() => {
    let syncInterval: NodeJS.Timeout | null = null;
    
    const checkConnection = async () => {
      try {
        const { isRealtimeConnected, isSearchDataMigrated } = await import('@/lib/firebaseSearch');
        const connected = await isRealtimeConnected();
        setRealtimeConnected(connected);
        setOfflineMode(!connected);
        
        // Set up auto-sync if connected and user is authenticated
        if (connected && currentUser?.uid) {
          // Check if data is already migrated
          const isMigrated = await isSearchDataMigrated(currentUser.uid);
          
          // If not migrated, set up periodic sync (every 5 minutes)
          if (!isMigrated && !syncInterval) {
            syncInterval = setInterval(async () => {
              if (!syncingToFirebase && serverHistory && serverHistory.length > 0) {
                console.log('Auto-sync: Syncing search history to Firebase...');
                try {
                  setSyncingToFirebase(true);
                  const { syncSearchHistoryToFirebase, markSearchDataMigrated } = await import('@/lib/firebaseSearch');
                  await syncSearchHistoryToFirebase(currentUser.uid, serverHistory);
                  await markSearchDataMigrated(currentUser.uid);
                } catch (error) {
                  console.error('Auto-sync: Error syncing to Firebase:', error);
                } finally {
                  setSyncingToFirebase(false);
                }
              }
            }, 5 * 60 * 1000); // 5 minutes
          }
        }
      } catch (error) {
        console.error('Error checking Firebase connection:', error);
        setRealtimeConnected(false);
        setOfflineMode(true);
      }
    };
    
    checkConnection();
    
    // Clean up interval on unmount
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [currentUser?.uid, syncingToFirebase]);

  // Fetch search history from server
  const {
    data: serverHistory,
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: ['/api/search/history', limit],
    queryFn: async () => {
      const data = await apiRequest(`/api/search/history?limit=${limit}`);
      return (data as unknown as HistoryResponse).history || [];
    }
  });

  // Fetch search suggestions based on input
  const {
    data: suggestions,
    isLoading: isLoadingSuggestions,
    error: suggestionsError,
    refetch: refetchSuggestions
  } = useQuery({
    queryKey: ['/api/search/suggestions', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) {
        return [] as SearchSuggestion[];
      }
      const data = await apiRequest(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
      return (data as unknown as SuggestionsResponse).suggestions || [];
    },
    enabled: searchQuery.length >= 2 // Only fetch if user has typed at least 2 characters
  });

  // Mutation to save a search to history
  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: Omit<InsertSearchHistory, 'userId'>) => {
      const data = await apiRequest('/api/search/save', {
        method: 'POST',
        data: searchData
      });
      return (data as unknown as SearchHistoryResponse).searchHistory;
    },
    onSuccess: () => {
      // Invalidate the search history query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save search: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Mutation to update a search history item (e.g., mark as favorite)
  const updateSearchHistoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<SearchHistory> }) => {
      const result = await apiRequest(`/api/search/history/${id}`, {
        method: 'PATCH',
        data: data
      });
      return (result as unknown as HistoryItemResponse).history;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update search history: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Handle search input change
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Handle performing a search
  const performSearch = useCallback(async (query: string, searchType: string = 'text_search') => {
    try {
      await saveSearchMutation.mutateAsync({
        query,
        type: searchType,
        successful: true
      });

      // Here you would also likely want to trigger the actual search functionality
      // For example, navigate to search results page or filter data

      return true;
    } catch {
      return false;
    }
  }, [saveSearchMutation]);

  // Sync local search history to Firebase
  const syncHistoryToFirebase = useCallback(async (): Promise<boolean> => {
    if (!currentUser?.uid || !serverHistory || serverHistory.length === 0) {
      return false;
    }
    
    try {
      setSyncingToFirebase(true);
      
      const { syncSearchHistoryToFirebase, markSearchDataMigrated } = await import('@/lib/firebaseSearch');
      
      // Sync all history items
      const result = await syncSearchHistoryToFirebase(currentUser.uid, serverHistory);
      
      if (result) {
        // Mark the data as migrated
        await markSearchDataMigrated(currentUser.uid);
        toast({
          title: 'Synkronisering fullført',
          description: `${serverHistory.length} søk er nå synkronisert til skyen`,
          variant: 'default',
        });
        return true;
      } else {
        throw new Error('Kunne ikke synkronisere søkehistorikk');
      }
    } catch (error) {
      console.error('Error syncing history to Firebase:', error);
      toast({
        title: 'Synkronisering feilet',
        description: 'Kunne ikke synkronisere søkehistorikk til skyen',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSyncingToFirebase(false);
    }
  }, [currentUser?.uid, serverHistory, toast]);
  
  // Toggle favorite status for a search
  const toggleFavorite = useCallback((searchItem: SearchHistory) => {
    const newFavoriteStatus = !searchItem.favorite;
    
    // Update in database via API
    updateSearchHistoryMutation.mutate({
      id: searchItem.id,
      data: { favorite: newFavoriteStatus }
    });
    
    // Also update in Firebase if user is authenticated
    if (currentUser?.uid) {
      // Import dynamically to avoid SSR issues
      import('@/lib/firebaseSearch').then(({ toggleSearchFavorite }) => {
        try {
          // We need to use the searchId from Firebase which is different from our database ID
          // So we concatenate the database ID with the user ID to create a unique search history entry ID
          const firebaseSearchId = `search-${searchItem.id}`;
          toggleSearchFavorite(currentUser.uid, firebaseSearchId, newFavoriteStatus);
        } catch (error) {
          console.error('Error updating favorite status in Firebase:', error);
          // Non-critical error, don't interrupt user experience
        }
      });
    }
  }, [updateSearchHistoryMutation, currentUser]);

  // Combine server history with any Firebase history
  const combinedHistory = useMemo(() => {
    return serverHistory || [];
  }, [serverHistory]);
  
  return {
    history: combinedHistory || [],
    suggestions: suggestions || [],
    isLoadingHistory,
    isLoadingSuggestions,
    historyError,
    suggestionsError,
    performSearch,
    handleSearchInputChange,
    toggleFavorite,
    searchQuery,
    saveSearchMutation,
    updateSearchHistoryMutation,
    // Add Firebase-related functionality
    syncHistoryToFirebase,
    isSyncingToFirebase: syncingToFirebase,
    isRealtimeConnected: realtimeConnected,
    offlineMode: offlineMode
  };
};