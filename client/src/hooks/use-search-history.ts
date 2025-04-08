import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { SearchHistory, SearchPreferences } from "@shared/schema";
import { useAuth } from "../contexts/AuthContext";

export interface SearchHistoryEntry {
  query: string;
  latitude?: string;
  longitude?: string;
  category?: string;
  timestamp: Date;
  resultCount?: number;
}

export interface SearchPreferencesData {
  favoriteCategories: string[];
  favoriteLocations: Array<{
    name: string;
    latitude: string;
    longitude: string;
    address?: string;
  }>;
  lastLocation?: { latitude: string; longitude: string };
  radius: number;
}

/**
 * Hook to manage search history and suggestions
 */
export function useSearchHistory() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Get search history
  const { 
    data: searchHistory = [],
    isLoading: isHistoryLoading,
    error: historyError 
  } = useQuery<SearchHistory[]>({
    queryKey: ['/api/search/history'],
    enabled: isAuthenticated, // Only fetch if user is authenticated
  });

  // Get search suggestions based on prefix
  const getSuggestions = async (prefix: string): Promise<string[]> => {
    if (!isAuthenticated || !prefix) return [];
    try {
      const result = await apiRequest(`/api/search/suggestions?prefix=${encodeURIComponent(prefix)}`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  };

  // Get search preferences
  const { 
    data: searchPreferences,
    isLoading: isPreferencesLoading,
    error: preferencesError 
  } = useQuery<SearchPreferences>({
    queryKey: ['/api/search/preferences'],
    enabled: isAuthenticated,
  });

  // Save search history
  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: {
      query: string;
      latitude?: string;
      longitude?: string;
      category?: string;
      resultCount?: number;
      successful?: boolean;
    }) => {
      return apiRequest('/api/search/history', {
        method: 'POST',
        data: searchData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
    },
  });

  // Update search preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<SearchPreferencesData>) => {
      return apiRequest('/api/search/preferences', {
        method: 'PUT',
        data: preferences,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/preferences'] });
    },
  });

  // Save search to history
  const saveSearch = (searchData: {
    query: string;
    latitude?: string;
    longitude?: string;
    category?: string;
    resultCount?: number;
    successful?: boolean;
  }) => {
    if (isAuthenticated) {
      saveSearchMutation.mutate(searchData);
    }
  };

  // Update user search preferences
  const updatePreferences = (preferences: Partial<SearchPreferencesData>) => {
    if (isAuthenticated) {
      updatePreferencesMutation.mutate(preferences);
    }
  };

  // Add a location to favorite locations
  const addFavoriteLocation = (location: { 
    name: string; 
    latitude: string; 
    longitude: string;
    address?: string;
  }) => {
    if (!isAuthenticated || !searchPreferences) return;
    
    const favoriteLocations = [
      ...(Array.isArray(searchPreferences.favoriteLocations) ? searchPreferences.favoriteLocations : []),
      location
    ];
    
    updatePreferencesMutation.mutate({ favoriteLocations });
  };

  // Add a category to favorite categories
  const addFavoriteCategory = (category: string) => {
    if (!isAuthenticated || !searchPreferences) return;
    
    // Only add if not already in the list
    const favCategories = Array.isArray(searchPreferences.favoriteCategories) ? searchPreferences.favoriteCategories : [];
    if (!favCategories.includes(category)) {
      const favoriteCategories = [
        ...favCategories,
        category
      ];
      
      updatePreferencesMutation.mutate({ favoriteCategories });
    }
  };

  // Update last searched location
  const updateLastLocation = (location: { latitude: string; longitude: string }) => {
    if (isAuthenticated) {
      updatePreferencesMutation.mutate({ lastLocation: location });
    }
  };

  // Update a search history item
  const updateSearchHistoryItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<SearchHistory> }) => {
      return apiRequest(`/api/search/history/${id}`, {
        method: 'PATCH',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
    },
  });
  
  // Update a search history item with tags, notes, or favorite status
  const updateSearchHistoryItem = (id: number, data: Partial<SearchHistory>) => {
    if (isAuthenticated) {
      updateSearchHistoryItemMutation.mutate({ id, data });
    }
  };

  return {
    searchHistory,
    isHistoryLoading,
    historyError,
    searchPreferences,
    isPreferencesLoading,
    preferencesError,
    saveSearch,
    getSuggestions,
    updatePreferences,
    addFavoriteLocation,
    addFavoriteCategory,
    updateLastLocation,
    updateSearchHistoryItem,
    isSaving: saveSearchMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isUpdatingHistoryItem: updateSearchHistoryItemMutation.isPending,
  };
}