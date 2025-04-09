import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ActivityRecommendation } from "@shared/schema";
import { DEVELOPMENT_MODE } from "@/lib/constants";

/**
 * Hook for fetching activity recommendations
 * @returns {UseQueryResult<ActivityRecommendation[]>} Query result with recommendations array
 */
export function useActivityRecommendations() {
  return useQuery<any, Error, ActivityRecommendation[]>({
    queryKey: ['/api/recommendations'],
    queryFn: async ({ queryKey }) => {
      try {
        const headers: Record<string, string> = {};
        if (DEVELOPMENT_MODE) {
          headers["X-Dev-Mode"] = "true";
        }

        console.log(`Query request to ${queryKey[0]} with development mode: ${DEVELOPMENT_MODE}`);
        const response = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers
        });

        if (!response.ok) {
          // Check if the error is due to permission issues
          const errorText = await response.text();
          if (errorText.includes('permission-denied') || response.status === 403) {
            throw new Error('permission-denied: You do not have access to this resource');
          }
          throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Received data from API:", data);
        return data;
      } catch (error) {
        console.error("Error in activity recommendations query:", error);
        throw error;
      }
    },
    select: (data) => {
      // Ensure we extract the recommendations array properly
      console.log("Processing data in select:", data);
      if (data && Array.isArray(data.recommendations)) {
        return data.recommendations;
      } else if (Array.isArray(data)) {
        return data;
      }
      // Return empty array if the data is not in expected format
      console.warn("Recommendations data is not in expected format:", data);
      return [];
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

// Hook for generating new recommendations
export function useGenerateRecommendations() {
  return useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/recommendations/generate', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      // Invalidate the recommendations query to refetch the data
      queryClient.invalidateQueries({
        queryKey: ['/api/recommendations']
      });
    }
  });
}

// Hook for updating recommendation status (accept, reject, save)
export function useUpdateRecommendationStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: 'pending' | 'accepted' | 'rejected' | 'saved' }) => {
      return await apiRequest(`/api/recommendations/${id}/status`, {
        method: 'PATCH',
        data: { status }
      });
    },
    onSuccess: () => {
      // Invalidate the recommendations query to refetch the data
      queryClient.invalidateQueries({
        queryKey: ['/api/recommendations']
      });
    }
  });
}