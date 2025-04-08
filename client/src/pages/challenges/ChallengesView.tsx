import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, challengesCollection, userChallengesCollection } from '@/lib/firebase';
import { Challenge, UserChallenge } from '@/types';
import { CheckCircle } from 'lucide-react';

export default function ChallengesView() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [dailyChallenge, setDailyChallenge] = useState<Challenge | null>(null);
  const [userDailyChallenge, setUserDailyChallenge] = useState<UserChallenge | null>(null);
  const [weeklyChallenge, setWeeklyChallenges] = useState<{challenge: Challenge, userChallenge: UserChallenge | null}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    points: 0,
    completed: 0,
    level: 1
  });

  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
      return;
    }

    // Fetch challenges and user progress
    const fetchChallenges = async () => {
      try {
        // Get daily challenge
        const dailyQuery = query(
          challengesCollection,
          where('type', '==', 'daily'),
          where('endTime', '>', Date.now())
        );
        
        const dailySnapshot = await getDocs(dailyQuery);
        if (!dailySnapshot.empty) {
          const dailyChallengeData = { id: dailySnapshot.docs[0].id, ...dailySnapshot.docs[0].data() } as Challenge;
          setDailyChallenge(dailyChallengeData);
          
          // Check if user has this challenge
          const userDailyQuery = query(
            userChallengesCollection,
            where('userId', '==', currentUser.uid),
            where('challengeId', '==', dailyChallengeData.id)
          );
          
          const userDailySnapshot = await getDocs(userDailyQuery);
          if (!userDailySnapshot.empty) {
            setUserDailyChallenge({ id: userDailySnapshot.docs[0].id, ...userDailySnapshot.docs[0].data() } as UserChallenge);
          }
        } else {
          // Create a default daily challenge if none exists
          const defaultDailyChallenge: Omit<Challenge, 'id'> = {
            title: 'Mingle Mission',
            description: 'Chat with someone new in your area using Bluetooth.',
            points: 10,
            target: 1,
            type: 'chat_new',
            startTime: Date.now(),
            endTime: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
          };
          
          const newDailyRef = await addDoc(challengesCollection, defaultDailyChallenge);
          setDailyChallenge({ id: newDailyRef.id, ...defaultDailyChallenge } as Challenge);
        }
        
        // Get weekly challenges
        const weeklyQuery = query(
          challengesCollection,
          where('type', '!=', 'daily'),
          where('endTime', '>', Date.now())
        );
        
        const weeklySnapshot = await getDocs(weeklyQuery);
        const weeklyChallenges: Challenge[] = [];
        weeklySnapshot.forEach(doc => {
          weeklyChallenges.push({ id: doc.id, ...doc.data() } as Challenge);
        });
        
        // If no weekly challenges, create some defaults
        if (weeklyChallenges.length === 0) {
          const defaultWeeklyChallenges = [
            {
              title: 'Find 3 hotspots',
              description: 'Visit 3 different locations where multiple users are gathered.',
              points: 25,
              target: 3,
              type: 'visit_hotspot',
              startTime: Date.now(),
              endTime: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
            },
            {
              title: 'Create an activity',
              description: 'Create a public activity and have at least one person join.',
              points: 15,
              target: 1,
              type: 'create_activity',
              startTime: Date.now(),
              endTime: Date.now() + (7 * 24 * 60 * 60 * 1000)
            },
            {
              title: 'Add 2 new friends',
              description: 'Connect with 2 new people and become friends.',
              points: 20,
              target: 2,
              type: 'add_friends',
              startTime: Date.now(),
              endTime: Date.now() + (7 * 24 * 60 * 60 * 1000)
            }
          ];
          
          for (const challenge of defaultWeeklyChallenges) {
            const newChallengeRef = await addDoc(challengesCollection, challenge);
            weeklyChallenges.push({ id: newChallengeRef.id, ...challenge } as Challenge);
          }
        }
        
        // Get user progress for weekly challenges
        const userChallenges: {challenge: Challenge, userChallenge: UserChallenge | null}[] = [];
        
        for (const challenge of weeklyChallenges) {
          const userQuery = query(
            userChallengesCollection,
            where('userId', '==', currentUser.uid),
            where('challengeId', '==', challenge.id)
          );
          
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            userChallenges.push({
              challenge,
              userChallenge: { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as UserChallenge
            });
          } else {
            userChallenges.push({
              challenge,
              userChallenge: null
            });
          }
        }
        
        setWeeklyChallenges(userChallenges);
        
        // Calculate user stats
        let totalPoints = 0;
        let completedChallenges = 0;
        
        const allUserChallengesQuery = query(
          userChallengesCollection,
          where('userId', '==', currentUser.uid)
        );
        
        const allUserChallengesSnapshot = await getDocs(allUserChallengesQuery);
        allUserChallengesSnapshot.forEach(doc => {
          const challenge = doc.data() as UserChallenge;
          if (challenge.completed) {
            completedChallenges++;
            
            // Get challenge points
            const challengeQuery = query(
              challengesCollection,
              where('id', '==', challenge.challengeId)
            );
            
            getDocs(challengeQuery).then(challengeSnapshot => {
              if (!challengeSnapshot.empty) {
                totalPoints += challengeSnapshot.docs[0].data().points;
                
                // Update user stats
                setUserStats({
                  points: totalPoints,
                  completed: completedChallenges,
                  level: Math.floor(totalPoints / 50) + 1 // Level up every 50 points
                });
              }
            });
          }
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching challenges:', error);
        setIsLoading(false);
      }
    };
    
    fetchChallenges();
  }, [currentUser, setLocation]);

  const startChallenge = async (challengeId: string) => {
    if (!currentUser) return;
    
    try {
      // Create user challenge record
      await addDoc(userChallengesCollection, {
        userId: currentUser.uid,
        challengeId,
        progress: 0,
        completed: false,
        createdAt: Date.now()
      });
      
      // Refresh challenges
      window.location.reload();
    } catch (error) {
      console.error('Error starting challenge:', error);
    }
  };

  const getChallengeProgress = (userChallenge: UserChallenge | null, total: number) => {
    if (!userChallenge) return 0;
    return (userChallenge.progress / total) * 100;
  };

  if (isLoading) {
    return (
      <div className="p-4 flex-1 flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="p-4">
        <h1 className="text-2xl font-bold font-heading mb-4">Challenges</h1>
        
        {/* Daily Challenge */}
        {dailyChallenge && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-lg">Today's Challenge</h3>
              <span className="text-sm bg-blue-100 text-blue-800 py-1 px-3 rounded-full">+{dailyChallenge.points} points</span>
            </div>
            <h2 className="text-xl font-bold mb-3">{dailyChallenge.title}</h2>
            <p className="text-gray-600 mb-4">{dailyChallenge.description}</p>
            
            <Progress 
              value={userDailyChallenge ? (userDailyChallenge.progress / dailyChallenge.target) * 100 : 0} 
              className="h-2 primary-gradient mb-3" 
            />
            <p className="text-sm text-gray-500">
              {userDailyChallenge ? userDailyChallenge.progress : 0}/{dailyChallenge.target} completed
            </p>
            
            {!userDailyChallenge ? (
              <Button 
                onClick={() => startChallenge(dailyChallenge.id)}
                className="w-full bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-3 rounded-lg font-medium mt-4"
              >
                Start Challenge
              </Button>
            ) : userDailyChallenge.completed ? (
              <div className="w-full bg-green-100 text-green-800 py-3 rounded-lg font-medium mt-4 text-center flex items-center justify-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Completed!
              </div>
            ) : (
              <Button 
                className="w-full bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-3 rounded-lg font-medium mt-4"
                disabled
              >
                In Progress
              </Button>
            )}
          </div>
        )}
        
        {/* Weekly Challenges */}
        <h2 className="font-medium text-lg mb-3">Weekly Challenges</h2>
        <div className="space-y-4">
          {weeklyChallenge.map(({ challenge, userChallenge }) => (
            <div key={challenge.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{challenge.title}</h3>
                <span className="text-sm bg-blue-100 text-blue-800 py-1 px-3 rounded-full">+{challenge.points} points</span>
              </div>
              <p className="text-gray-600 text-sm mb-3">{challenge.description}</p>
              
              <Progress 
                value={getChallengeProgress(userChallenge, challenge.target)} 
                className="h-2 mb-2" 
              />
              <p className="text-sm text-gray-500 flex items-center">
                {userChallenge && userChallenge.completed ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Completed!
                  </>
                ) : (
                  `${userChallenge ? userChallenge.progress : 0}/${challenge.target} completed`
                )}
              </p>
              
              {!userChallenge && (
                <Button 
                  onClick={() => startChallenge(challenge.id)}
                  className="w-full bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-2 rounded-lg font-medium mt-3 text-sm"
                  size="sm"
                >
                  Accept Challenge
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {/* Achievement Stats */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium mb-2">Your Stats</h3>
          <div className="flex justify-between">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{userStats.points}</p>
              <p className="text-sm text-gray-600">Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{userStats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{userStats.level}</p>
              <p className="text-sm text-gray-600">Level</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
