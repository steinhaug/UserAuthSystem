import React, { useEffect, useState } from "react";
import { useActivityRecommendations, useGenerateRecommendations } from "@/hooks/use-activity-recommendations";
import { RecommendationCard } from "@/components/activities/RecommendationCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { RefreshCcwIcon } from "lucide-react";
import type { Activity } from "@shared/schema";

export default function RecommendationsView() {
  const { data: recommendations, isLoading, error, refetch } = useActivityRecommendations();
  const { mutate: generateRecommendations, isPending: isGenerating } = useGenerateRecommendations();
  const [activities, setActivities] = useState<{[key: string]: Activity}>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch activities referenced in recommendations
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      const activityIds = recommendations.map(rec => rec.activityId);
      
      // Fetch each activity
      const fetchActivities = async () => {
        const activitiesMap: {[key: string]: Activity} = {};
        
        for (const activityId of activityIds) {
          try {
            const response = await fetch(`/api/activities/${activityId}`);
            if (response.ok) {
              const data = await response.json();
              activitiesMap[activityId] = data.activity;
            }
          } catch (error) {
            console.error(`Error fetching activity ${activityId}:`, error);
          }
        }
        
        setActivities(activitiesMap);
      };
      
      fetchActivities();
    }
  }, [recommendations]);
  
  const handleRefresh = () => {
    generateRecommendations();
    toast({
      title: "Generating new recommendations",
      description: "We're finding new activities that match your preferences.",
    });
  };
  
  const handleViewDetails = (activityId: string | number) => {
    setLocation(`/activities/${activityId}`);
  };
  
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Recommended for You</h1>
          <Button disabled variant="outline" size="sm">
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-20 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-9 w-24" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
          <h3 className="text-red-800 font-medium">Could not load recommendations</h3>
          <p className="text-red-600 text-sm mt-1">
            There was a problem loading your personalized recommendations. Please try again later.
          </p>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="mt-3 border-red-200 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 pb-16">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Recommended for You</h1>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isGenerating}
        >
          <RefreshCcwIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {!recommendations || recommendations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No recommendations yet</h3>
          <p className="text-gray-500 mb-4">
            We'll suggest activities based on your preferences and history.
          </p>
          <Button onClick={handleRefresh} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Recommendations"}
          </Button>
        </div>
      ) : (
        <div>
          {recommendations.map((recommendation) => (
            <RecommendationCard 
              key={recommendation.id}
              recommendation={recommendation}
              activity={activities[recommendation.activityId]}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}