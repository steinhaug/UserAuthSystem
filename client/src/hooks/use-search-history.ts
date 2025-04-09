import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SearchHistory, InsertSearchHistory } from "@shared/schema";

export function useSearchHistory(limit: number = 10) {
  return useQuery({
    queryKey: ['/api/search/history'],
    queryFn: async () => {
      const response = await apiRequest(`/api/search/history?limit=${limit}`);
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
}

export function useSaveSearchHistory() {
  return useMutation({
    mutationFn: async (data: Partial<InsertSearchHistory>) => {
      const response = await apiRequest("/api/search/history", {
        method: "POST",
        data: data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search/suggestions'] });
    },
  });
}

export function useUpdateSearchHistory() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SearchHistory> }) => {
      const response = await apiRequest(`/api/search/history/${id}`, {
        method: "PATCH",
        data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
    },
  });
}

export function useSearchSuggestions(prefix: string = '') {
  return useQuery({
    queryKey: ['/api/search/suggestions', prefix],
    queryFn: async () => {
      if (!prefix || prefix.length < 2) return [];
      
      const response = await apiRequest(`/api/search/suggestions?prefix=${encodeURIComponent(prefix)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search suggestions');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: prefix.length >= 2,
  });
}

export function useNearbySearchSuggestions() {
  return useQuery({
    queryKey: ['/api/search/near-me'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/search/near-me');
        if (!response.ok) {
          console.error("Error fetching nearby suggestions:", response.statusText);
          return [];
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching nearby suggestions:", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}

export function useSearchPreferences() {
  return useQuery({
    queryKey: ['/api/search/preferences'],
    queryFn: async () => {
      const response = await apiRequest('/api/search/preferences');
      return response.json();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useUpdateSearchPreferences() {
  return useMutation({
    mutationFn: async (data: Partial<SearchHistory>) => {
      const response = await apiRequest('/api/search/preferences', {
        method: 'PUT',
        data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/preferences'] });
    },
  });
}