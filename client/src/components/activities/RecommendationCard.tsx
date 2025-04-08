import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityRecommendation } from "@shared/schema";
import { CheckIcon, XIcon, BookmarkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUpdateRecommendationStatus } from "@/hooks/use-activity-recommendations";

type RecommendationCardProps = {
  recommendation: ActivityRecommendation;
  activity: any; // We should eventually type this properly
  onViewDetails: (activityId: string | number) => void;
};

export function RecommendationCard({ recommendation, activity, onViewDetails }: RecommendationCardProps) {
  const { mutate: updateStatus } = useUpdateRecommendationStatus();
  
  const handleAccept = () => {
    updateStatus({ id: recommendation.id, status: 'accepted' });
  };
  
  const handleReject = () => {
    updateStatus({ id: recommendation.id, status: 'rejected' });
  };
  
  const handleSave = () => {
    updateStatus({ id: recommendation.id, status: 'saved' });
  };
  
  const getStatusBadge = () => {
    switch (recommendation.status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'saved':
        return <Badge className="bg-blue-100 text-blue-800">Saved for later</Badge>;
      default:
        return null;
    }
  };
  
  const renderMatchPercentage = () => {
    // Convert score to percentage (assuming score is 0-100)
    const percentage = Math.min(100, Math.max(0, recommendation.score));
    
    // Determine color based on percentage
    let colorClass = "text-gray-500";
    if (percentage >= 80) {
      colorClass = "text-green-600 font-bold";
    } else if (percentage >= 60) {
      colorClass = "text-yellow-600 font-medium";
    }
    
    return (
      <span className={colorClass}>{percentage}% match</span>
    );
  };
  
  const formatDate = (timestamp: Date | string | number) => {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{activity?.title || 'Loading...'}</CardTitle>
            <CardDescription className="mt-1">
              {activity?.category && (
                <span className="capitalize">{activity.category.replace('_', ' ')}</span>
              )}
              {activity && activity.startTime && (
                <span className="mx-2 text-gray-400">•</span>
              )}
              {activity && activity.startTime && (
                <span>{formatDate(activity.startTime)}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center">
            {getStatusBadge()}
            <span className="ml-2">{renderMatchPercentage()}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-gray-600 mb-2">
          {recommendation.reason}
        </p>
        
        {/* Location info would go here */}
        {activity?.locationName && (
          <p className="text-sm text-gray-600">
            📍 {activity.locationName}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 border-t">
        <Button variant="ghost" onClick={() => onViewDetails(recommendation.activityId)}>
          View Details
        </Button>
        
        {recommendation.status === 'pending' && (
          <div className="flex space-x-2">
            <Button 
              onClick={handleReject} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <XIcon className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleSave} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleAccept} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-green-200 hover:bg-green-50 hover:text-green-600"
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}