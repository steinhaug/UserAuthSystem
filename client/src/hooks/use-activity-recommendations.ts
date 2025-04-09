import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ActivityRecommendation } from "@shared/schema";

// Hook for fetching activity recommendations
export function useActivityRecommendations() {
  return useQuery({
    queryKey: ['/api/recommendations'],
    // Note: We're not defining a custom queryFn here, so it will use the default
    // queryFn from queryClient which already includes the X-Dev-Mode header
    // and proper error handling
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