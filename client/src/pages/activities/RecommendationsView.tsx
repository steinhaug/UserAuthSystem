import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcwIcon, MapIcon, CalendarIcon, Loader2 } from 'lucide-react';
import { RecommendationCard } from '@/components/activities/RecommendationCard';
import { useActivityRecommendations, useGenerateRecommendations } from '@/hooks/use-activity-recommendations';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

export default function RecommendationsView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Hent anbefalinger via React Query
  const { data: recommendationsData, isLoading, isError, error } = useActivityRecommendations();
  
  // State for activities data
  const [activitiesMap, setActivitiesMap] = useState<Record<string | number, any>>({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  
  // Mutation for å generere nye anbefalinger
  const { mutate: generateRecommendations, isPending: isGenerating } = useGenerateRecommendations();
  
  // Hent aktivitetsdetaljer for alle anbefalinger
  useEffect(() => {
    const fetchActivities = async () => {
      if (!recommendationsData || recommendationsData.length === 0) return;
      
      setIsLoadingActivities(true);
      
      try {
        const activityIds = [...new Set(recommendationsData.map(rec => rec.activityId))];
        const activitiesObj: Record<string | number, any> = {};
        
        // Hent hver aktivitet
        await Promise.all(activityIds.map(async (id) => {
          try {
            const response = await fetch(`/api/activities/${id}`);
            if (response.ok) {
              const data = await response.json();
              activitiesObj[id] = data.activity;
            }
          } catch (err) {
            console.error(`Error fetching activity ${id}:`, err);
          }
        }));
        
        setActivitiesMap(activitiesObj);
      } catch (err) {
        console.error("Error fetching activities:", err);
      } finally {
        setIsLoadingActivities(false);
      }
    };
    
    fetchActivities();
  }, [recommendationsData]);

  // Håndter oppdatering av anbefalinger
  const handleRefresh = () => {
    generateRecommendations(undefined, {
      onSuccess: () => {
        toast({
          title: 'Anbefalinger oppdatert',
          description: 'Nye anbefalinger har blitt generert basert på dine preferanser.',
        });
      },
      onError: (err) => {
        toast({
          title: 'Feil ved oppdatering',
          description: 'Det oppstod en feil ved generering av nye anbefalinger.',
          variant: 'destructive',
        });
        console.error("Error generating recommendations:", err);
      }
    });
  };
  
  // Håndter navigasjon til aktivitetsdetaljer
  const handleViewActivityDetails = (activityId: string | number) => {
    setLocation(`/activities/${activityId}`);
  };
  
  // Render loading state
  if (isLoading || isGenerating) {
    return (
      <div className="p-4 pb-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Anbefalinger for deg</h1>
          <Button 
            variant="outline" 
            size="sm"
            disabled
          >
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Laster inn...
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-24 w-full mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Render error state
  if (isError) {
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil';
    const isPermissionError = errorMessage.includes('permission-denied');
    
    return (
      <div className="p-4 pb-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Anbefalinger for deg</h1>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
          >
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Prøv igjen
          </Button>
        </div>
        
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-100 mb-6">
          <h3 className="text-lg font-medium text-red-700 mb-2">
            {isPermissionError ? 'Ikke innlogget' : 'Kunne ikke laste anbefalinger'}
          </h3>
          <p className="text-red-500 mb-4">
            {isPermissionError 
              ? 'Du må være innlogget for å se dine anbefalinger.' 
              : `Det oppstod en feil: ${errorMessage}`}
          </p>
          
          {isPermissionError && (
            <Button
              onClick={() => setLocation('/auth/login')}
              variant="default"
            >
              Logg inn
            </Button>
          )}
        </div>
        
        {/* Navigasjonsknapper */}
        <div className="flex justify-center mt-8 space-x-4">
          <Button 
            onClick={() => setLocation('/map')} 
            variant="outline"
            className="w-full"
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Utforsk kartet
          </Button>
          
          <Button 
            onClick={() => setLocation('/activities')} 
            variant="outline"
            className="w-full"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Alle aktiviteter
          </Button>
        </div>
      </div>
    );
  }
  
  // No recommendations state
  if (!recommendationsData || recommendationsData.length === 0) {
    return (
      <div className="p-4 pb-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Anbefalinger for deg</h1>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
          >
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Oppdater
          </Button>
        </div>
        
        <div className="text-center py-12 bg-gray-50 rounded-lg border mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Ingen anbefalinger funnet</h3>
          <p className="text-gray-500 mb-4">
            Vi kunne ikke finne noen anbefalinger til deg. Oppdater dine preferanser eller klikk "Oppdater" for å generere nye anbefalinger.
          </p>
          
          <Button onClick={handleRefresh} variant="default">
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Generer anbefalinger
          </Button>
        </div>
        
        {/* Navigasjonsknapper */}
        <div className="flex justify-center mt-8 space-x-4">
          <Button 
            onClick={() => setLocation('/map')} 
            variant="outline"
            className="w-full"
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Utforsk kartet
          </Button>
          
          <Button 
            onClick={() => setLocation('/activities')} 
            variant="outline"
            className="w-full"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Alle aktiviteter
          </Button>
        </div>
      </div>
    );
  }
  
  // Render recommendations
  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Anbefalinger for deg</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setLocation('/activities/preferences')} 
            variant="outline" 
            size="sm"
          >
            Endre preferanser
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oppdaterer...
              </>
            ) : (
              <>
                <RefreshCcwIcon className="h-4 w-4 mr-2" />
                Oppdater
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Recommendations cards */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {isLoadingActivities ? (
          // Skeleton loading for activities
          [1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-24 w-full mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          ))
        ) : (
          // Actual recommendation cards
          recommendationsData.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              activity={activitiesMap[recommendation.activityId]}
              onViewDetails={handleViewActivityDetails}
            />
          ))
        )}
      </div>
      
      {/* Navigasjonsknapper */}
      <div className="flex justify-center mt-8 space-x-4">
        <Button 
          onClick={() => setLocation('/map')} 
          variant="outline"
          className="w-full"
        >
          <MapIcon className="h-4 w-4 mr-2" />
          Utforsk kartet
        </Button>
        
        <Button 
          onClick={() => setLocation('/activities')} 
          variant="outline"
          className="w-full"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Alle aktiviteter
        </Button>
      </div>
    </div>
  );
}