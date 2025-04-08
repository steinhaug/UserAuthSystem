import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchIcon, MoreVertical } from 'lucide-react';
import { ChatThread } from '@/types';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ChatListProps {
  chatThreads: ChatThread[];
  isLoading: boolean;
}

export default function ChatList({ chatThreads, isLoading }: ChatListProps) {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [bluetoothChats, setBluetoothChats] = useState<ChatThread[]>([]);
  const [regularChats, setRegularChats] = useState<ChatThread[]>([]);
  const [chatPartners, setChatPartners] = useState<Record<string, any>>({});

  // Split chats into Bluetooth and regular chats
  useState(() => {
    const bluetooth: ChatThread[] = [];
    const regular: ChatThread[] = [];

    chatThreads.forEach(thread => {
      if (thread.isBluetoothChat) {
        bluetooth.push(thread);
      } else {
        regular.push(thread);
      }
    });

    setBluetoothChats(bluetooth);
    setRegularChats(regular);
  });

  // Get chat partner details for each thread
  useState(() => {
    const fetchChatPartners = async () => {
      const partners: Record<string, any> = {};
      
      for (const thread of chatThreads) {
        // Find the other participant (not the current user)
        const otherParticipantId = thread.participants.find(id => id !== currentUser?.uid);
        
        if (otherParticipantId && otherParticipantId !== 'system') {
          // Get user data from Firestore
          try {
            const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
            if (userDoc.exists()) {
              partners[thread.id] = { id: userDoc.id, ...userDoc.data() };
            }
          } catch (error) {
            console.error('Error fetching chat partner:', error);
          }
        }
      }
      
      setChatPartners(partners);
    };
    
    if (chatThreads.length > 0 && currentUser) {
      fetchChatPartners();
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement chat search
  };

  const navigateToChat = (threadId: string) => {
    setLocation(`/chat/${threadId}`);
  };

  // Format time for chat thread
  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (date.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000) {
      // Within last week, show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older, show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div id="chat-list" className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold font-heading">Messages</h1>
        <Button variant="ghost" className="p-2 text-primary">
          <MoreVertical className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Chat Search */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <Input 
          type="text"
          placeholder="Search messages..." 
          className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
      </form>
      
      {/* Chat List Items */}
      <div className="space-y-3">
        {/* Bluetooth Chats */}
        {bluetoothChats.length > 0 && (
          <>
            <div className="pt-3 pb-1 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">BLUETOOTH CHATS</h3>
            </div>
            
            {bluetoothChats.map(thread => {
              const partner = chatPartners[thread.id];
              const lastMessage = thread.lastMessage;
              
              return (
                <div 
                  key={thread.id}
                  onClick={() => navigateToChat(thread.id)} 
                  className="bg-white rounded-lg shadow-sm p-3 flex items-center cursor-pointer"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      {partner?.photoURL ? (
                        <AvatarImage src={partner.photoURL} alt={partner?.displayName || 'User'} />
                      ) : (
                        <AvatarFallback>{partner?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></span>
                  </div>
                  <div className="flex-1 ml-3">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{partner?.displayName || 'Unknown User'}</h3>
                      <span className="text-xs text-gray-500">
                        {lastMessage?.createdAt ? formatTime(lastMessage.createdAt) : 'just now'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-500 text-sm truncate w-48">
                        {lastMessage?.content || 'No messages yet'}
                      </p>
                      {/* Add unread message indicator if needed */}
                      {lastMessage && !lastMessage.read && lastMessage.senderId !== currentUser?.uid && (
                        <span className="inline-block w-5 h-5 bg-primary rounded-full text-white text-xs flex items-center justify-center">1</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        {/* Regular Chats */}
        {regularChats.length > 0 && (
          <>
            <div className="pt-3 pb-1 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">RECENT MESSAGES</h3>
            </div>
            
            {regularChats.map(thread => {
              const partner = chatPartners[thread.id];
              const lastMessage = thread.lastMessage;
              
              return (
                <div 
                  key={thread.id}
                  onClick={() => navigateToChat(thread.id)} 
                  className="bg-white rounded-lg shadow-sm p-3 flex items-center cursor-pointer"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      {partner?.photoURL ? (
                        <AvatarImage src={partner.photoURL} alt={partner?.displayName || 'User'} />
                      ) : (
                        <AvatarFallback>{partner?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      partner?.status === 'online' ? 'bg-green-500' : 
                      partner?.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></span>
                  </div>
                  <div className="flex-1 ml-3">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{partner?.displayName || 'Unknown User'}</h3>
                      <span className="text-xs text-gray-500">
                        {lastMessage?.createdAt ? formatTime(lastMessage.createdAt) : 'just now'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm truncate">
                      {lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        {/* Empty state */}
        {chatThreads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No conversations yet</p>
            <p className="text-sm mt-2">Visit the Nearby tab to connect with people around you</p>
          </div>
        )}
      </div>
    </div>
  );
}
