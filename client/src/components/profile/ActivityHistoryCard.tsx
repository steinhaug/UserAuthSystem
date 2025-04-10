import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, MapPin, Users, Clock, ThumbsUp, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEVELOPMENT_MODE } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

// Types for activity history
interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  creatorName: string;
  creatorPhotoURL?: string;
}

interface ActivityHistoryCardProps {
  userId: string;
}

export default function ActivityHistoryCard({ userId }: ActivityHistoryCardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        if (DEVELOPMENT_MODE) {
          // In development mode, use mock data
          await new Promise(resolve => setTimeout(resolve, 600));
          
          setActivities([
            {
              id: '1',
              title: 'Plogging i Frognerparken',
              description: 'Bli med på plogging i Frognerparken. Vi samler søppel mens vi jogger!',
              location: 'Frognerparken, Oslo',
              category: 'sports',
              startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              endTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
              participantCount: 8,
              status: 'completed',
              creatorName: 'Mari Hansen',
              creatorPhotoURL: ''
            },
            {
              id: '2',
              title: 'Kaffe og programmering',
              description: 'Møt andre teknologiinteresserte for en uformell prat om koding og kaffe.',
              location: 'Kaffebrenneriet, Oslo',
              category: 'social',
              startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
              participantCount: 5,
              status: 'completed',
              creatorName: 'Per Olsen',
              creatorPhotoURL: ''
            },
            {
              id: '3',
              title: 'Yoga i parken',
              description: 'Gratis yoga-økt i parken for alle nivåer.',
              location: 'Sofienbergparken, Oslo',
              category: 'sports',
              startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(),
              participantCount: 12,
              status: 'upcoming',
              creatorName: 'Ida Johansen',
              creatorPhotoURL: ''
            }
          ]);
        } else {
          // In production mode, fetch data from API
          const response = await fetch(`/api/users/${userId}/activities`);
          if (!response.ok) {
            throw new Error('Failed to fetch activities');
          }
          const data = await response.json();
          setActivities(data);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        toast({
          title: 'Error loading activities',
          description: 'Could not load your activity history. Please try again later.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivities();
  }, [userId, toast]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('no-NO', { 
      day: 'numeric', 
      month: 'short'
    }).format(date);
  };
  
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('no-NO', { 
      hour: '2-digit', 
      minute: '2-digit'
    }).format(date);
  };
  
  const getCategoryBadge = (category: string) => {
    const categoryMap: Record<string, { label: string, color: string }> = {
      sports: { label: 'Sport', color: 'bg-green-100 text-green-800' },
      social: { label: 'Sosial', color: 'bg-blue-100 text-blue-800' },
      food_drinks: { label: 'Mat & Drikke', color: 'bg-orange-100 text-orange-800' },
      games: { label: 'Spill', color: 'bg-violet-100 text-violet-800' },
      other: { label: 'Annet', color: 'bg-gray-100 text-gray-800' }
    };
    
    const { label, color } = categoryMap[category] || categoryMap.other;
    
    return (
      <Badge className={`${color} hover:${color}`} variant="outline">
        {label}
      </Badge>
    );
  };
  
  const getStatusBadge = (status: Activity['status']) => {
    const statusMap: Record<Activity['status'], { label: string, color: string }> = {
      upcoming: { label: 'Kommende', color: 'bg-blue-100 text-blue-800' },
      active: { label: 'Aktiv', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Fullført', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Avlyst', color: 'bg-red-100 text-red-800' }
    };
    
    const { label, color } = statusMap[status];
    
    return (
      <Badge className={`${color} hover:${color}`} variant="outline">
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Aktivitetshistorikk</CardTitle>
          <CardDescription>Laster inn aktiviteter...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-t-4 border-primary rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Aktivitetshistorikk</CardTitle>
            <CardDescription>Dine tidligere og kommende aktiviteter</CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            {activities.length} Totalt
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center p-6">
            <p className="text-gray-500 mb-3">Du har ikke deltatt i noen aktiviteter enda.</p>
            <Button className="bg-gradient-to-r from-[#FF5252] to-[#FF1744]">
              Finn aktiviteter
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div key={activity.id} className="border rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{activity.title}</h3>
                    {getStatusBadge(activity.status)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{activity.location}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center text-sm">
                      <CalendarDays className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{formatDate(activity.startTime)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{formatTime(activity.startTime)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        {activity.creatorPhotoURL ? (
                          <AvatarImage src={activity.creatorPhotoURL} alt={activity.creatorName} />
                        ) : (
                          <AvatarFallback>{activity.creatorName.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm">{activity.creatorName}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      {getCategoryBadge(activity.category)}
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        <span>{activity.participantCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {activity.status === 'completed' && (
                  <div className="bg-gray-50 p-2 flex justify-between items-center text-sm">
                    <span className="text-gray-600">Takk for din deltakelse!</span>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      <span>Vurder</span>
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex justify-center mt-2">
              <Button variant="outline" size="sm" className="text-gray-500">
                <MoreHorizontal className="h-4 w-4 mr-1" />
                <span>Vis mer</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}