import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ActivityPreferences } from "@shared/schema";

// Hook for fetching activity preferences
export function useActivityPreferences() {
  return useQuery({
    queryKey: ['/api/activity-preferences'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/activity-preferences');
        
        if (!response.ok) {
          // Check if the error is due to permission issues
          const errorText = await response.text();
          if (errorText.includes('permission-denied') || response.status === 403) {
            throw new Error('permission-denied: Du har ikke tilgang til denne ressursen');
          }
          throw new Error(`Kunne ikke hente preferanser: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.preferences as ActivityPreferences;
      } catch (error) {
        console.error("Error fetching activity preferences:", error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if (error instanceof Error && error.message.includes('permission-denied')) {
        return false;
      }
      return failureCount < 3;
    }
  });
}

// Hook for updating activity preferences
export function useUpdateActivityPreferences() {
  return useMutation({
    mutationFn: async (preferences: Partial<ActivityPreferences>) => {
      return await apiRequest('/api/activity-preferences', {
        method: 'PUT',
        data: preferences
      });
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({
        queryKey: ['/api/activity-preferences']
      });
      
      // Also invalidate recommendations since they depend on preferences
      queryClient.invalidateQueries({
        queryKey: ['/api/recommendations']
      });
    }
  });
}