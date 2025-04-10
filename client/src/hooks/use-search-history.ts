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
  const { user } = useAuth() || { user: null };
  const [firebaseData, setFirebaseData] = useState<PersonalizedSuggestionsResponse | null>(null);
  
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
        return data as PersonalizedSuggestionsResponse;
      } catch (error) {
        console.error('Error fetching personalized suggestions:', error);
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
    if (!user?.uid) return;
    
    // Import Firebase search functions dynamically to avoid SSR issues
    import('@/lib/firebaseSearch').then(({ listenToPersonalizedSuggestions }) => {
      // Set up real-time listener
      const unsubscribe = listenToPersonalizedSuggestions(user.uid, (data) => {
        setFirebaseData(data);
      });
      
      // Clean up listener on unmount
      return () => unsubscribe();
    });
  }, [user?.uid]);
  
  // Combine server data with Firebase data, preferring Firebase when available
  const data = useMemo(() => {
    if (firebaseData) {
      return firebaseData;
    }
    return serverQuery.data || {
      suggestions: [],
      trending: [],
      categories: {
        favorites: [],
        timeBased: [],
        trending: [],
        preferences: []
      }
    };
  }, [firebaseData, serverQuery.data]);
  
  return {
    ...serverQuery,
    data,
    isLoading: serverQuery.isLoading && !firebaseData
  };
};

// Hook for saving search history
export const useSaveSearchHistory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (searchData: Omit<InsertSearchHistory, 'userId'>) => {
      const data = await apiRequest('/api/search/save', {
        method: 'POST',
        data: searchData
      });
      return (data as unknown as SearchHistoryResponse).searchHistory;
    },
    onSuccess: () => {
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
};

export const useSearchHistory = (limit: number = 10) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch search history
  const {
    data: history,
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

  // Toggle favorite status for a search
  const toggleFavorite = useCallback((searchItem: SearchHistory) => {
    updateSearchHistoryMutation.mutate({
      id: searchItem.id,
      data: { favorite: !searchItem.favorite }
    });
  }, [updateSearchHistoryMutation]);

  return {
    history: history || [],
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
    updateSearchHistoryMutation
  };
};