import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, MapPin } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  onSnapshot, 
  orderBy,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db, friendsCollection } from '@/lib/firebase';
import { Friend, User } from '@/types';
import { SearchIcon } from 'lucide-react';

export default function FriendsView() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState<{user: User; status: string}[]>([]);
  const [friendRequests, setFriendRequests] = useState<{user: User; requestId: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
      return;
    }
    
    // Get all friends and friend requests
    const fetchFriends = async () => {
      try {
        // Query for accepted friends
        const acceptedFriendsQuery = query(
          friendsCollection,
          where('status', '==', 'accepted'),
          where('participants', 'array-contains', currentUser.uid)
        );
        
        // Query for pending friend requests received
        const pendingRequestsQuery = query(
          friendsCollection,
          where('status', '==', 'pending'),
          where('friendId', '==', currentUser.uid)
        );
        
        // Set up real-time listeners
        const unsubscribeFriends = onSnapshot(acceptedFriendsQuery, async (snapshot) => {
          const friendsData: {user: User; status: string}[] = [];
          
          // Process each friend document
          for (const doc of snapshot.docs) {
            const friendData = doc.data() as Friend;
            // Get the other user's ID (not current user)
            const friendId = friendData.participants.find(id => id !== currentUser.uid);
            
            if (friendId) {
              // Fetch user details
              const userDoc = await getDocs(query(
                collection(db, 'users'),
                where('id', '==', friendId)
              ));
              
              if (!userDoc.empty) {
                const userData = userDoc.docs[0].data() as User;
                friendsData.push({
                  user: userData,
                  status: userData.status || 'offline'
                });
              }
            }
          }
          
          setFriends(friendsData);
        });
        
        const unsubscribeRequests = onSnapshot(pendingRequestsQuery, async (snapshot) => {
          const requestsData: {user: User; requestId: string}[] = [];
          
          // Process each friend request
          for (const doc of snapshot.docs) {
            const requestData = doc.data() as Friend;
            
            // Fetch requester's details
            const userDoc = await getDocs(query(
              collection(db, 'users'),
              where('id', '==', requestData.userId)
            ));
            
            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data() as User;
              requestsData.push({
                user: userData,
                requestId: doc.id
              });
            }
          }
          
          setFriendRequests(requestsData);
          setIsLoading(false);
        });
        
        return () => {
          unsubscribeFriends();
          unsubscribeRequests();
        };
      } catch (error) {
        console.error('Error fetching friends:', error);
        setIsLoading(false);
      }
    };
    
    fetchFriends();
  }, [currentUser, setLocation]);
  
  const filterFriends = () => {
    if (!searchQuery) return friends;
    
    return friends.filter(friend => 
      friend.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (friend.user.interests && 
        friend.user.interests.some(interest => 
          interest.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );
  };
  
  const acceptFriendRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(friendsCollection, requestId), {
        status: 'accepted'
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };
  
  const declineFriendRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(friendsCollection, requestId));
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };
  
  const startChat = (friendId: string) => {
    // Find or create chat thread and redirect
    if (!currentUser) return;
    
    addDoc(collection(db, 'chat_threads'), {
      participants: [currentUser.uid, friendId],
      isBluetoothChat: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }).then(docRef => {
      setLocation(`/chat/${docRef.id}`);
    }).catch(error => {
      console.error('Error starting chat:', error);
    });
  };
  
  const viewLocation = (friendId: string) => {
    // Implementation to view friend's location on map
    setLocation('/map');
  };
  
  // Split friends by online status
  const onlineFriends = friends.filter(friend => friend.status === 'online');
  const offlineFriends = friends.filter(friend => friend.status !== 'online');
  
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
        <h1 className="text-2xl font-bold font-heading mb-4">Friends</h1>
        
        {/* Search Friends */}
        <div className="relative mb-6">
          <Input 
            type="text" 
            placeholder="Search friends..." 
            className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
        
        {/* Friends List */}
        <div className="space-y-3">
          {/* Online Friends */}
          {onlineFriends.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">ONLINE NOW</h3>
              
              {onlineFriends.map(friend => (
                <div key={friend.user.id} className="bg-white rounded-lg shadow-sm p-3 flex items-center mt-2">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      {friend.user.photoURL ? (
                        <AvatarImage src={friend.user.photoURL} alt={friend.user.displayName} />
                      ) : (
                        <AvatarFallback>{friend.user.displayName.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
                  </div>
                  <div className="flex-1 ml-3">
                    <h3 className="font-medium">{friend.user.displayName}</h3>
                    <p className="text-gray-500 text-xs">Active now</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => startChat(friend.user.id)} className="text-primary p-2 rounded-full hover:bg-red-50" variant="ghost">
                      <MessageSquare className="h-5 w-5" />
                    </Button>
                    <Button onClick={() => viewLocation(friend.user.id)} className="text-primary p-2 rounded-full hover:bg-red-50" variant="ghost">
                      <MapPin className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Offline Friends */}
          {offlineFriends.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">OFFLINE</h3>
              
              {offlineFriends.map(friend => (
                <div key={friend.user.id} className="bg-white rounded-lg shadow-sm p-3 flex items-center">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      {friend.user.photoURL ? (
                        <AvatarImage src={friend.user.photoURL} alt={friend.user.displayName} />
                      ) : (
                        <AvatarFallback>{friend.user.displayName.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-gray-400 border-2 border-white"></span>
                  </div>
                  <div className="flex-1 ml-3">
                    <h3 className="font-medium">{friend.user.displayName}</h3>
                    <p className="text-gray-500 text-xs">
                      Last seen {friend.user.lastSeen ? new Date(friend.user.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'a while ago'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => startChat(friend.user.id)} className="text-gray-400 p-2 rounded-full hover:bg-gray-100" variant="ghost">
                      <MessageSquare className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">FRIEND REQUESTS</h3>
              
              {friendRequests.map(request => (
                <div key={request.requestId} className="bg-white rounded-lg shadow-sm p-3">
                  <div className="flex items-center">
                    <Avatar className="w-12 h-12">
                      {request.user.photoURL ? (
                        <AvatarImage src={request.user.photoURL} alt={request.user.displayName} />
                      ) : (
                        <AvatarFallback>{request.user.displayName.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 ml-3">
                      <h3 className="font-medium">{request.user.displayName}</h3>
                      <p className="text-gray-500 text-xs">Found via Bluetooth • {Math.floor((Date.now() - request.user.lastSeen) / 60000)}m ago</p>
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-3">
                    <Button 
                      onClick={() => declineFriendRequest(request.requestId)}
                      className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium"
                      variant="secondary"
                    >
                      Decline
                    </Button>
                    <Button 
                      onClick={() => acceptFriendRequest(request.requestId)}
                      className="flex-1 py-2 bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white rounded-full text-sm font-medium"
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Empty State */}
          {friends.length === 0 && friendRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No friends yet</p>
              <p className="text-sm mt-2">Visit the Nearby tab to find people around you</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
