import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlusIcon, MapPinIcon, ClockIcon } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Activity, ActivityCategory } from '@/types';

export default function ActivitiesView() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ActivityCategory | 'all'>('all');

  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
      return;
    }

    // Fetch activities from Firestore
    const fetchActivities = async () => {
      try {
        const activitiesRef = collection(db, 'activities');
        
        // Get activities that haven't ended yet
        const now = Date.now();
        const q = query(
          activitiesRef,
          where('endTime', '>', now),
          orderBy('endTime', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedActivities: Activity[] = [];
        
        querySnapshot.forEach((doc) => {
          fetchedActivities.push({ id: doc.id, ...doc.data() } as Activity);
        });
        
        setActivities(fetchedActivities);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [currentUser, setLocation]);

  const createActivity = () => {
    setLocation('/activities/create');
  };

  const viewActivityOnMap = (activityId: string) => {
    // Implement view on map functionality
    console.log('View activity on map:', activityId);
  };

  const joinActivity = (activityId: string) => {
    // Implement join activity functionality
    console.log('Join activity:', activityId);
  };

  const getStatusBadge = (activity: Activity) => {
    const now = Date.now();
    
    if (now >= activity.startTime && now <= activity.endTime) {
      return <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Happening Now</span>;
    } else if (now < activity.startTime) {
      return <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Starting Soon</span>;
    } else {
      return <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Completed</span>;
    }
  };

  const formatTimeRemaining = (timestamp: number) => {
    const now = Date.now();
    const diffMs = timestamp - now;
    
    if (diffMs < 0) {
      return 'Ended';
    }
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
    } else {
      return `${mins} minute${mins > 1 ? 's' : ''}`;
    }
  };

  const filterActivities = (category: ActivityCategory | 'all') => {
    setActiveFilter(category);
  };

  const filteredActivities = activities.filter(activity => 
    activeFilter === 'all' || activity.category === activeFilter
  );

  if (loading) {
    return (
      <div className="p-4 flex-1 flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold font-heading">Activities</h1>
          <Button 
            onClick={createActivity}
            className="bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-2 px-4 rounded-full flex items-center text-sm"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Create
          </Button>
        </div>
        
        {/* Activity Filters */}
        <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
          <Button 
            onClick={() => filterActivities('all')}
            className={`py-1 px-4 rounded-full text-sm whitespace-nowrap ${activeFilter === 'all' 
              ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white' 
              : 'bg-gray-200 text-gray-700'}`}
          >
            All
          </Button>
          <Button 
            onClick={() => filterActivities('sports')}
            className={`py-1 px-4 rounded-full text-sm whitespace-nowrap ${activeFilter === 'sports' 
              ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white' 
              : 'bg-gray-200 text-gray-700'}`}
          >
            Sports
          </Button>
          <Button 
            onClick={() => filterActivities('social')}
            className={`py-1 px-4 rounded-full text-sm whitespace-nowrap ${activeFilter === 'social' 
              ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white' 
              : 'bg-gray-200 text-gray-700'}`}
          >
            Social
          </Button>
          <Button 
            onClick={() => filterActivities('food_drinks')}
            className={`py-1 px-4 rounded-full text-sm whitespace-nowrap ${activeFilter === 'food_drinks' 
              ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white' 
              : 'bg-gray-200 text-gray-700'}`}
          >
            Food & Drinks
          </Button>
          <Button 
            onClick={() => filterActivities('games')}
            className={`py-1 px-4 rounded-full text-sm whitespace-nowrap ${activeFilter === 'games' 
              ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white' 
              : 'bg-gray-200 text-gray-700'}`}
          >
            Games
          </Button>
        </div>
        
        {/* Activities List */}
        {filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {getStatusBadge(activity)}
                      <h3 className="font-medium text-lg mt-1">{activity.title}</h3>
                    </div>
                    <span className="text-sm text-gray-500">2/8 joined</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span>{activity.locationName}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span>
                      {Date.now() < activity.startTime 
                        ? `Starts in ${formatTimeRemaining(activity.startTime)}`
                        : `Ends in ${formatTimeRemaining(activity.endTime)}`}
                    </span>
                  </div>
                  
                  <div className="flex -space-x-2 mb-4">
                    {/* This would be dynamically populated with participants */}
                    <Avatar className="w-8 h-8 border-2 border-white">
                      <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" alt="Participant" />
                      <AvatarFallback>P1</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white">
                      <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" alt="Participant" />
                      <AvatarFallback>P2</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                <div className="border-t flex">
                  <Button 
                    onClick={() => viewActivityOnMap(activity.id)}
                    className="flex-1 py-3 text-center text-primary font-medium border-r bg-white hover:bg-gray-50"
                    variant="ghost"
                  >
                    View on Map
                  </Button>
                  <Button 
                    onClick={() => joinActivity(activity.id)}
                    className="flex-1 py-3 text-center text-white font-medium bg-gradient-to-r from-[#FF5252] to-[#FF1744]"
                  >
                    Join Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No activities found. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
