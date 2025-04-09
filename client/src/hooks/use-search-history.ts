import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
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
      const res = await makeApiRequest(`/api/search/history?limit=${limit}`);
      const jsonData = res;
      return jsonData.history as SearchHistory[];
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
      const res = await makeApiRequest(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
      const jsonData = res;
      return jsonData.suggestions as SearchSuggestion[];
    },
    enabled: searchQuery.length >= 2 // Only fetch if user has typed at least 2 characters
  });

  // Mutation to save a search to history
  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: Omit<InsertSearchHistory, 'userId'>) => {
      const res = await makeApiRequest('/api/search/save', {
        method: 'POST',
        data: searchData
      });
      const jsonData = res;
      return jsonData.searchHistory as SearchHistory;
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
      const res = await makeApiRequest(`/api/search/history/${id}`, {
        method: 'PATCH',
        data: data
      });
      const jsonData = res;
      return jsonData.history as SearchHistory;
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