import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useMicroInteractions } from '@/contexts/MicroInteractionsContext';
import { SparklesIcon, Trophy, Target, Bell, Star } from 'lucide-react';

export const InteractionDemo = () => {
  const { triggerHint, awardPoints, getUserPoints } = useMicroInteractions();
  
  const handleDemoWelcome = () => {
    triggerHint('welcome-tour');
  };
  
  const handleDemoMapExploration = () => {
    triggerHint('map-exploration');
  };
  
  const handleDemoFeatureAnnouncement = () => {
    triggerHint('new-feature-chat');
  };
  
  const handleDemoActivityCompletion = () => {
    // Show activity completion hint
    triggerHint('activity-completed');
    
    // Award points with animation
    awardPoints(5, 'Du fullførte en aktivitet');
  };
  
  const handleDemoRecommendations = () => {
    triggerHint('try-recommendations');
  };
  
  const currentPoints = getUserPoints();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          Mikrointeraksjoner Demosenter
        </CardTitle>
        <CardDescription>
          Test ut ulike kontekstuelle mikrointeraksjoner som forbedrer brukeropplevelsen
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6 p-3 bg-slate-50 rounded-md border">
          <p className="text-sm font-medium">Dine poeng: <span className="font-bold text-primary">{currentPoints}</span></p>
          <p className="text-xs text-muted-foreground mt-1">Poeng tjenes når du gjennomfører aktiviteter og utfordringer</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={handleDemoWelcome}
            variant="outline" 
            className="flex items-center justify-start gap-2 h-auto py-3"
          >
            <Target className="h-4 w-4 text-blue-500" />
            <div className="text-left">
              <p className="font-medium">Velkomst Tour</p>
              <p className="text-xs text-muted-foreground">Introduser nye funksjoner</p>
            </div>
          </Button>
          
          <Button 
            onClick={handleDemoMapExploration}
            variant="outline" 
            className="flex items-center justify-start gap-2 h-auto py-3"
          >
            <Bell className="h-4 w-4 text-green-500" />
            <div className="text-left">
              <p className="font-medium">Kart Utforskning</p>
              <p className="text-xs text-muted-foreground">Vis kart-brukstips</p>
            </div>
          </Button>
          
          <Button 
            onClick={handleDemoRecommendations}
            variant="outline" 
            className="flex items-center justify-start gap-2 h-auto py-3"
          >
            <Star className="h-4 w-4 text-yellow-500" />
            <div className="text-left">
              <p className="font-medium">Anbefalinger</p>
              <p className="text-xs text-muted-foreground">Oppmuntre til anbefalinger</p>
            </div>
          </Button>
          
          <Button 
            onClick={handleDemoFeatureAnnouncement}
            variant="outline" 
            className="flex items-center justify-start gap-2 h-auto py-3"
          >
            <Bell className="h-4 w-4 text-purple-500" />
            <div className="text-left">
              <p className="font-medium">Ny Funksjon</p>
              <p className="text-xs text-muted-foreground">Kunngjør nye funksjoner</p>
            </div>
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-center">
        <Button 
          onClick={handleDemoActivityCompletion}
          variant="default" 
          className="w-full"
        >
          <Trophy className="h-4 w-4 mr-2" />
          Simpler aktivitetsgjennomføring (få poeng)
        </Button>
      </CardFooter>
    </Card>
  );
};