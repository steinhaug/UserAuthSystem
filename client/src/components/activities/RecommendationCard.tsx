import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityRecommendation } from "@shared/schema";
import { 
  CheckIcon, 
  XIcon, 
  BookmarkIcon, 
  Users2Icon, 
  MapPinIcon,
  ClockIcon,
  CalendarIcon
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useUpdateRecommendationStatus } from "@/hooks/use-activity-recommendations";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type RecommendationCardProps = {
  recommendation: ActivityRecommendation;
  activity: any; // We should eventually type this properly
  onViewDetails: (activityId: string | number) => void;
};

export function RecommendationCard({ recommendation, activity, onViewDetails }: RecommendationCardProps) {
  const { mutate: updateStatus, isPending } = useUpdateRecommendationStatus();
  const { toast } = useToast();
  
  const handleAccept = () => {
    updateStatus(
      { id: recommendation.id, status: 'accepted' },
      {
        onSuccess: () => {
          toast({
            title: "Akseptert!",
            description: `Du har akseptert aktiviteten "${activity?.title || 'Aktivitet'}"`,
          });
        },
        onError: () => {
          toast({
            title: "Feil",
            description: "Kunne ikke akseptere aktiviteten. Prøv igjen senere.",
            variant: "destructive",
          });
        }
      }
    );
  };
  
  const handleReject = () => {
    updateStatus(
      { id: recommendation.id, status: 'rejected' },
      {
        onSuccess: () => {
          toast({
            title: "Avvist",
            description: "Aktiviteten er fjernet fra dine anbefalinger",
          });
        },
        onError: () => {
          toast({
            title: "Feil",
            description: "Kunne ikke avvise aktiviteten. Prøv igjen senere.",
            variant: "destructive",
          });
        }
      }
    );
  };
  
  const handleSave = () => {
    updateStatus(
      { id: recommendation.id, status: 'saved' },
      {
        onSuccess: () => {
          toast({
            title: "Lagret",
            description: "Aktiviteten er lagret for senere",
          });
        },
        onError: () => {
          toast({
            title: "Feil",
            description: "Kunne ikke lagre aktiviteten. Prøv igjen senere.",
            variant: "destructive",
          });
        }
      }
    );
  };
  
  const getStatusBadge = () => {
    switch (recommendation.status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Akseptert</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Avvist</Badge>;
      case 'saved':
        return <Badge className="bg-blue-100 text-blue-800">Lagret</Badge>;
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
  
  const formatRelativeDate = (timestamp: Date | string | number) => {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: nb });
  };
  
  const formatTimeDate = (timestamp: Date | string | number) => {
    const date = new Date(timestamp);
    return format(date, "d. MMM 'kl' HH:mm", { locale: nb });
  };
  
  // Handle loading state gracefully
  if (!activity) {
    return (
      <Card className="mb-4 overflow-hidden animate-pulse">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="w-3/4">
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="h-4 bg-gray-100 rounded mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2 border-t">
          <div className="h-9 bg-gray-100 rounded w-24"></div>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="mb-4 overflow-hidden border-l-4 hover:shadow-md transition-shadow" 
          style={{ borderLeftColor: recommendation.score >= 80 ? '#22c55e' : recommendation.score >= 60 ? '#eab308' : '#94a3b8' }}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{activity.title}</CardTitle>
            <CardDescription className="mt-1">
              {activity.category && (
                <span className="capitalize">{activity.category.replace('_', ' ')}</span>
              )}
              {activity.startTime && (
                <span className="mx-2 text-gray-400">•</span>
              )}
              {activity.startTime && (
                <span>{formatRelativeDate(activity.startTime)}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center">
            {getStatusBadge()}
            <span className="ml-2">{renderMatchPercentage()}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2 space-y-2">
        <p className="text-sm text-gray-600">
          {recommendation.reason}
        </p>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          {activity.locationName && (
            <div className="flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              <span>{activity.locationName}</span>
            </div>
          )}
          
          {activity.maxParticipants && (
            <div className="flex items-center gap-1">
              <Users2Icon className="h-3 w-3" />
              <span>Maks {activity.maxParticipants} deltakere</span>
            </div>
          )}
          
          {activity.startTime && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{formatTimeDate(activity.startTime)}</span>
            </div>
          )}
          
          {activity.startTime && activity.endTime && (
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              <span>
                {new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime() > 86400000 
                  ? `${Math.round((new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime()) / 86400000)} dager`
                  : `${Math.round((new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime()) / 3600000)} timer`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 border-t">
        <Button variant="ghost" onClick={() => onViewDetails(recommendation.activityId)}>
          Se detaljer
        </Button>
        
        {recommendation.status === 'pending' && (
          <div className="flex space-x-2">
            <Button 
              onClick={handleReject} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-red-200 hover:bg-red-50 hover:text-red-600"
              disabled={isPending}
            >
              <XIcon className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleSave} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              disabled={isPending}
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleAccept} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full border-green-200 hover:bg-green-50 hover:text-green-600"
              disabled={isPending}
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}