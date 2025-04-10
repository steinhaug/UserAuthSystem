import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Award, Clock, Star, ThumbsUp, Users, Zap } from 'lucide-react';
import { DEVELOPMENT_MODE } from '@/lib/constants';

// These types would normally come from your API but for development we'll define them here
interface Reputation {
  overallScore: number;
  reliabilityScore: number;
  safetyScore: number;
  communityScore: number;
  activityCount: number;
  verificationLevel: number;
  isVerified: boolean;
}

interface ReputationEvent {
  id: string;
  eventType: string;
  impact: number;
  description: string;
  createdAt: string;
  category: string;
}

interface ReputationCardProps {
  userId: string;
}

export default function ReputationCard({ userId }: ReputationCardProps) {
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [events, setEvents] = useState<ReputationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReputationData = async () => {
      setIsLoading(true);
      try {
        if (DEVELOPMENT_MODE) {
          // In development mode, use mock data
          await new Promise(resolve => setTimeout(resolve, 800));
          
          setReputation({
            overallScore: 78,
            reliabilityScore: 82,
            safetyScore: 90,
            communityScore: 75,
            activityCount: 14,
            verificationLevel: 2,
            isVerified: true
          });
          
          setEvents([
            {
              id: '1',
              eventType: 'activity_completed',
              impact: 5,
              description: 'Completed activity "Plogging i Frognerparken"',
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              category: 'reliability'
            },
            {
              id: '2',
              eventType: 'received_positive_rating',
              impact: 3,
              description: 'Received 5-star rating from another user',
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              category: 'community'
            },
            {
              id: '3',
              eventType: 'identity_verified',
              impact: 10,
              description: 'Email address verified',
              createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              category: 'safety'
            }
          ]);
        } else {
          // In production mode, fetch data from API
          const reputationResponse = await fetch(`/api/users/${userId}/reputation`);
          if (!reputationResponse.ok) {
            throw new Error('Failed to fetch reputation data');
          }
          const reputationData = await reputationResponse.json();
          setReputation(reputationData);
          
          const eventsResponse = await fetch(`/api/users/${userId}/reputation/events`);
          if (!eventsResponse.ok) {
            throw new Error('Failed to fetch reputation events');
          }
          const eventsData = await eventsResponse.json();
          setEvents(eventsData);
        }
      } catch (error) {
        console.error('Error fetching reputation data:', error);
        toast({
          title: 'Error loading reputation',
          description: 'Could not load reputation data. Please try again later.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReputationData();
  }, [userId, toast]);

  const getVerificationLevelLabel = (level: number): string => {
    const labels = [
      'New User',
      'Basic',
      'Verified',
      'Trusted',
      'Expert',
      'Ambassador'
    ];
    return labels[level] || 'Unknown';
  };
  
  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getProgressColor = (score: number): string => {
    if (score >= 85) return 'bg-green-600';
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'reliability':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'safety':
        return <Shield className="h-4 w-4 text-emerald-500" />;
      case 'community':
        return <Users className="h-4 w-4 text-violet-500" />;
      default:
        return <Star className="h-4 w-4 text-amber-500" />;
    }
  };
  
  const getImpactIcon = (impact: number) => {
    if (impact > 0) {
      return <ThumbsUp className="h-4 w-4 text-green-500" />;
    } else {
      return <ThumbsUp className="h-4 w-4 text-red-500 rotate-180" />;
    }
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('no-NO', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Reputation</CardTitle>
          <CardDescription>Loading reputation data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-t-4 border-primary rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!reputation) {
    return (
      <Card className="w-full mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Reputation</CardTitle>
          <CardDescription>No reputation data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-gray-500 py-4">
            Start participating in activities to build your reputation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Reputation</CardTitle>
            <CardDescription>Your trust score and activity history</CardDescription>
          </div>
          <Badge className="ml-2" variant={reputation.isVerified ? "default" : "outline"}>
            <Shield className="h-3 w-3 mr-1" />
            {getVerificationLevelLabel(reputation.verificationLevel)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
            <TabsTrigger value="badges" className="flex-1">Badges</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Overall Trust</span>
                  <span className={`text-sm font-semibold ${getScoreColor(reputation.overallScore)}`}>
                    {reputation.overallScore}/100
                  </span>
                </div>
                <Progress value={reputation.overallScore} className="h-2" indicatorClassName={getProgressColor(reputation.overallScore)} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <Clock className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="text-sm font-medium">Reliability</span>
                  </div>
                  <div className="flex justify-between">
                    <Progress 
                      value={reputation.reliabilityScore} 
                      className="h-1.5 w-3/4" 
                      indicatorClassName={getProgressColor(reputation.reliabilityScore)} 
                    />
                    <span className={`text-xs font-semibold ${getScoreColor(reputation.reliabilityScore)}`}>
                      {reputation.reliabilityScore}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <Shield className="h-4 w-4 mr-1 text-emerald-500" />
                    <span className="text-sm font-medium">Safety</span>
                  </div>
                  <div className="flex justify-between">
                    <Progress 
                      value={reputation.safetyScore} 
                      className="h-1.5 w-3/4" 
                      indicatorClassName={getProgressColor(reputation.safetyScore)} 
                    />
                    <span className={`text-xs font-semibold ${getScoreColor(reputation.safetyScore)}`}>
                      {reputation.safetyScore}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <Users className="h-4 w-4 mr-1 text-violet-500" />
                    <span className="text-sm font-medium">Community</span>
                  </div>
                  <div className="flex justify-between">
                    <Progress 
                      value={reputation.communityScore} 
                      className="h-1.5 w-3/4" 
                      indicatorClassName={getProgressColor(reputation.communityScore)} 
                    />
                    <span className={`text-xs font-semibold ${getScoreColor(reputation.communityScore)}`}>
                      {reputation.communityScore}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center mt-4">
                <Award className="h-5 w-5 mr-2 text-amber-500" />
                <span className="text-sm">
                  <strong>{reputation.activityCount}</strong> activities completed
                </span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="space-y-2">
              {events.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4">
                  No reputation events yet. Participate in activities to build your history.
                </p>
              ) : (
                events.map(event => (
                  <div key={event.id} className="flex items-start p-2 border-b border-gray-100 text-sm">
                    <div className="mr-3 mt-0.5">
                      {getCategoryIcon(event.category)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{event.description}</p>
                      <p className="text-gray-500 text-xs">{formatDate(event.createdAt)}</p>
                    </div>
                    <div className="flex items-center">
                      {getImpactIcon(event.impact)}
                      <span className={`ml-1 text-xs font-semibold ${event.impact > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {event.impact > 0 ? `+${event.impact}` : event.impact}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="badges">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center text-center">
                <div className="bg-blue-100 rounded-full p-3 mb-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <p className="font-medium text-sm">Early Adopter</p>
                <p className="text-xs text-gray-500">Joined during beta</p>
              </div>
              
              {reputation.activityCount >= 5 && (
                <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-green-100 rounded-full p-3 mb-2">
                    <Award className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="font-medium text-sm">Activity Star</p>
                  <p className="text-xs text-gray-500">Completed 5+ activities</p>
                </div>
              )}
              
              {reputation.isVerified && (
                <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-emerald-100 rounded-full p-3 mb-2">
                    <Shield className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="font-medium text-sm">Verified User</p>
                  <p className="text-xs text-gray-500">Identity confirmed</p>
                </div>
              )}
              
              {reputation.reliabilityScore >= 80 && (
                <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-amber-100 rounded-full p-3 mb-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="font-medium text-sm">Dependable</p>
                  <p className="text-xs text-gray-500">High reliability score</p>
                </div>
              )}
              
              {reputation.communityScore >= 80 && (
                <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-violet-100 rounded-full p-3 mb-2">
                    <Users className="h-5 w-5 text-violet-500" />
                  </div>
                  <p className="font-medium text-sm">Community Builder</p>
                  <p className="text-xs text-gray-500">Active community member</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}