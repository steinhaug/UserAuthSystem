import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReputationDisplay } from '@/components/reputation/ReputationDisplay';
import { ReputationHistory } from '@/components/reputation/ReputationHistory';
import { TrustConnections } from '@/components/reputation/TrustConnections';
import { UserRating, UserRatingDisplay } from '@/components/reputation/UserRating';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ReputationPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState('dev-user-id');
  
  // Get user reputation
  const {
    data: reputationData,
    isLoading: isLoadingReputation,
    error: reputationError
  } = useQuery({
    queryKey: [`/api/reputation/${userId}`],
  });

  // Get reputation events and types
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError
  } = useQuery({
    queryKey: [`/api/reputation/${userId}/events`],
  });

  // Get trust connections
  const {
    data: trustData,
    isLoading: isLoadingTrust,
    error: trustError
  } = useQuery({
    queryKey: [`/api/trust/${userId}`],
  });

  // Handle add trust connection
  const handleAddTrust = async (userId: string, level: number, notes?: string) => {
    try {
      await apiRequest(`/api/trust`, { 
        method: "POST", 
        data: { trustedId: userId, level, notes } 
      });
      // Invalidate trust connections cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/trust/${userId}`] });
      return Promise.resolve();
    } catch (error) {
      console.error("Error adding trust:", error);
      toast({
        title: "Kunne ikke legge til tillit",
        description: "Det oppstod en feil ved tillegging av tillit",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };

  // Handle update trust connection
  const handleUpdateTrust = async (userId: string, level: number, notes?: string) => {
    try {
      await apiRequest(`/api/trust/${userId}`, {
        method: "PATCH", 
        data: { level, notes }
      });
      // Invalidate trust connections cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/trust/${userId}`] });
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating trust:", error);
      toast({
        title: "Kunne ikke oppdatere tillit",
        description: "Det oppstod en feil ved oppdatering av tillit",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };

  // Handle remove trust connection
  const handleRemoveTrust = async (userId: string) => {
    try {
      await apiRequest(`/api/trust/${userId}`, { 
        method: "DELETE" 
      });
      // Invalidate trust connections cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/trust/${userId}`] });
      return Promise.resolve();
    } catch (error) {
      console.error("Error removing trust:", error);
      toast({
        title: "Kunne ikke fjerne tillit",
        description: "Det oppstod en feil ved fjerning av tillit",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };

  // Search users (for trust connections)
  const searchUsers = async (query: string) => {
    try {
      const res = await apiRequest(`/api/users/search?q=${encodeURIComponent(query)}`);
      return res?.users || [];
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Kunne ikke søke etter brukere",
        description: "Det oppstod en feil ved søk etter brukere",
        variant: "destructive",
      });
      return [];
    }
  };

  // Create mock data for demo if not available
  useEffect(() => {
    if (reputationError) {
      console.warn("Reputation data not available, creating mock data for demo");
      
      // This would be replaced with real data in production
      // It's only used here for demonstration purposes
      const mockReputation = {
        id: 1,
        userId: 'dev-user-id',
        overallScore: 78,
        reliabilityScore: 82,
        safetyScore: 75,
        communityScore: 80,
        activityCount: 23,
        verificationLevel: 2,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Set mock data in the cache
      queryClient.setQueryData([`/api/reputation/${userId}`], { reputation: mockReputation });
    }
  }, [reputationError, userId]);

  // Create mock events data for demo if not available
  useEffect(() => {
    if (eventsError) {
      console.warn("Reputation events not available, creating mock data for demo");
      
      // This would be replaced with real data in production
      // It's only used here for demonstration purposes
      const mockEventTypes = [
        { id: 1, name: "Aktivitet fullført", description: "Fullførte en aktivitet", category: "activity", pointsImpact: 2 },
        { id: 2, name: "Tillit mottatt", description: "Noen har lagt til sin tillit til deg", category: "community", pointsImpact: 5 },
        { id: 3, name: "God vurdering", description: "Fikk en positiv vurdering fra en bruker", category: "rating", pointsImpact: 3 },
        { id: 4, name: "Verifisert kontakt", description: "Kontakt med en verifisert bruker", category: "safety", pointsImpact: 2 },
      ];
      
      const mockEvents = [
        { 
          id: 1, 
          userId: 'dev-user-id', 
          eventTypeId: 1,
          value: 2,
          details: JSON.stringify({ activity_id: 123, activity_name: "Plogging i Frognerparken" }),
          referenceId: "activity_123",
          referenceType: "activity",
          createdAt: new Date(Date.now() - 3600000 * 24 * 2)
        },
        { 
          id: 2, 
          userId: 'dev-user-id', 
          eventTypeId: 2,
          value: 5,
          details: JSON.stringify({ from_user_id: "user_456", from_user_name: "Anna Hansen" }),
          referenceId: "trust_456",
          referenceType: "trust",
          createdAt: new Date(Date.now() - 3600000 * 24 * 5)
        },
        { 
          id: 3, 
          userId: 'dev-user-id', 
          eventTypeId: 3,
          value: 3,
          details: JSON.stringify({ rating: 5, context: "activity" }),
          referenceId: "rating_789",
          referenceType: "rating",
          createdAt: new Date(Date.now() - 3600000 * 24 * 10)
        },
      ];
      
      // Set mock data in the cache
      queryClient.setQueryData([`/api/reputation/${userId}/events`], { 
        events: mockEvents, 
        eventTypes: mockEventTypes
      });
    }
  }, [eventsError, userId]);

  // Create mock trust connections data for demo if not available
  useEffect(() => {
    if (trustError) {
      console.warn("Trust connections not available, creating mock data for demo");
      
      // This would be replaced with real data in production
      // It's only used here for demonstration purposes
      const mockTrustedUsers = [
        {
          id: 1,
          trusterId: 'dev-user-id',
          trustedId: 'user-1',
          level: 3,
          notes: "Nær venn og treningspartner",
          createdAt: new Date(Date.now() - 3600000 * 24 * 30),
          updatedAt: new Date(Date.now() - 3600000 * 24 * 30),
          user: {
            id: 101,
            firebaseId: 'user-1',
            username: 'elinberg',
            displayName: 'Elin Berg',
            email: 'elin@example.com',
            status: 'online',
            createdAt: new Date(Date.now() - 3600000 * 24 * 90),
            photoURL: 'https://randomuser.me/api/portraits/women/44.jpg'
          }
        },
        {
          id: 2,
          trusterId: 'dev-user-id',
          trustedId: 'user-2',
          level: 2,
          notes: "Møttes på flere plogging-aktiviteter",
          createdAt: new Date(Date.now() - 3600000 * 24 * 20),
          updatedAt: new Date(Date.now() - 3600000 * 24 * 20),
          user: {
            id: 102,
            firebaseId: 'user-2',
            username: 'olavh',
            displayName: 'Olav Hansen',
            email: 'olav@example.com',
            status: 'offline',
            createdAt: new Date(Date.now() - 3600000 * 24 * 60),
            photoURL: 'https://randomuser.me/api/portraits/men/32.jpg'
          }
        }
      ];
      
      const mockTrustedByUsers = [
        {
          id: 3,
          trusterId: 'user-3',
          trustedId: 'dev-user-id',
          level: 3,
          notes: "Pålitelig aktivitetspartner",
          createdAt: new Date(Date.now() - 3600000 * 24 * 25),
          updatedAt: new Date(Date.now() - 3600000 * 24 * 25),
          user: {
            id: 103,
            firebaseId: 'user-3',
            username: 'marial',
            displayName: 'Maria Larsen',
            email: 'maria@example.com',
            status: 'online',
            createdAt: new Date(Date.now() - 3600000 * 24 * 70),
            photoURL: 'https://randomuser.me/api/portraits/women/17.jpg'
          }
        },
        {
          id: 4,
          trusterId: 'user-4',
          trustedId: 'dev-user-id',
          level: 1,
          notes: null,
          createdAt: new Date(Date.now() - 3600000 * 24 * 5),
          updatedAt: new Date(Date.now() - 3600000 * 24 * 5),
          user: {
            id: 104,
            firebaseId: 'user-4',
            username: 'einarj',
            displayName: 'Einar Johansen',
            email: 'einar@example.com',
            status: 'offline',
            createdAt: new Date(Date.now() - 3600000 * 24 * 40),
            photoURL: 'https://randomuser.me/api/portraits/men/67.jpg'
          }
        }
      ];
      
      // Set mock data in the cache
      queryClient.setQueryData([`/api/trust/${userId}`], { 
        trusted: mockTrustedUsers, 
        trustedBy: mockTrustedByUsers
      });
    }
  }, [trustError, userId]);

  // Extract data from queries
  const reputation = reputationData?.reputation;
  const events = eventsData?.events || [];
  const eventTypes = eventsData?.eventTypes || [];
  const trustedUsers = trustData?.trusted || [];
  const trustedByUsers = trustData?.trustedBy || [];

  const isLoading = isLoadingReputation || isLoadingEvents || isLoadingTrust;

  // Mock user for demo
  const currentUser = {
    id: 100,
    firebaseId: 'dev-user-id',
    username: 'devuser',
    displayName: 'Dev User',
    email: 'dev@example.com',
    status: 'online',
    createdAt: new Date(Date.now() - 3600000 * 24 * 100)
  };

  const userToRate = {
    id: 101,
    firebaseId: 'user-1',
    username: 'elinberg',
    displayName: 'Elin Berg',
    email: 'elin@example.com',
    status: 'online',
    createdAt: new Date(Date.now() - 3600000 * 24 * 90)
  };

  // If loading, show a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Omdømme og tillitssystem</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reputation Display */}
        <div>
          {reputation && (
            <ReputationDisplay 
              reputation={reputation} 
              user={currentUser}
              showDetails={true}
            />
          )}
        </div>
        
        {/* Reputation History */}
        <div>
          {events.length > 0 && eventTypes.length > 0 && (
            <ReputationHistory 
              events={events}
              eventTypes={eventTypes}
              maxEvents={5}
            />
          )}
        </div>
      </div>
      
      {/* Trust Connections */}
      <div className="mt-8">
        <Tabs defaultValue="trust">
          <TabsList className="mb-4">
            <TabsTrigger value="trust">Tillitsnettverk</TabsTrigger>
            <TabsTrigger value="rating">Vurdering</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trust">
            <TrustConnections 
              currentUserId={userId}
              trustedUsers={trustedUsers}
              trustedByUsers={trustedByUsers}
              onAddTrust={handleAddTrust}
              onUpdateTrust={handleUpdateTrust}
              onRemoveTrust={handleRemoveTrust}
              searchUsers={searchUsers}
            />
          </TabsContent>
          
          <TabsContent value="rating">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gi vurdering</CardTitle>
                  <CardDescription>Gi en vurdering av en annen bruker</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserRating 
                    currentUser={currentUser}
                    userToRate={userToRate}
                    context="activity"
                    onSubmitRating={async (rating) => {
                      try {
                        await apiRequest("/api/ratings", {
                          method: "POST",
                          data: rating
                        });
                        toast({
                          title: "Vurdering sendt",
                          description: "Din vurdering har blitt sendt",
                        });
                        return Promise.resolve();
                      } catch (error) {
                        console.error("Error submitting rating:", error);
                        toast({
                          title: "Kunne ikke sende vurdering",
                          description: "Det oppstod en feil ved sending av vurdering",
                          variant: "destructive",
                        });
                        return Promise.reject(error);
                      }
                    }}
                    onCancel={() => {}}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Vurderinger mottatt</CardTitle>
                  <CardDescription>Vurderinger du har mottatt fra andre brukere</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 border rounded-md">
                      <div>
                        <p className="font-medium">Maria Larsen</p>
                        <p className="text-sm text-muted-foreground">For aktivitet: Plogging i Frognerparken</p>
                        <p className="text-sm mt-1">Veldig hyggelig å samarbeide med!</p>
                      </div>
                      <UserRatingDisplay 
                        averageRating={4.5}
                        ratingCount={1}
                        size="md"
                      />
                    </div>
                    <div className="flex justify-between items-center p-4 border rounded-md">
                      <div>
                        <p className="font-medium">Olav Hansen</p>
                        <p className="text-sm text-muted-foreground">For aktivitet: Yogaklasse i Slottsparken</p>
                        <p className="text-sm mt-1">Møtte opp presist og fulgte planene.</p>
                      </div>
                      <UserRatingDisplay 
                        averageRating={5}
                        ratingCount={1}
                        size="md"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}