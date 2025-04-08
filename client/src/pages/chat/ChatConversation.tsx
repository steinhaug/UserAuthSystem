import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  MoreVertical, 
  SmileIcon, 
  ImageIcon, 
  SendIcon 
} from 'lucide-react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  db, 
  chatThreadsCollection, 
  chatMessagesCollection, 
  friendsCollection 
} from '@/lib/firebase';
import { ChatMessage, Friend } from '@/types';

interface ChatConversationProps {
  id: string;  // Chat thread ID
}

export default function ChatConversation({ id }: ChatConversationProps) {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatType, setChatType] = useState<'bluetooth' | 'regular'>('regular');
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
      return;
    }

    // Fetch chat thread details
    const fetchChatThread = async () => {
      try {
        const threadDoc = await getDoc(doc(db, 'chat_threads', id));
        
        if (!threadDoc.exists()) {
          setLocation('/chat');
          return;
        }
        
        const threadData = threadDoc.data();
        setChatType(threadData.isBluetoothChat ? 'bluetooth' : 'regular');
        
        // Get the other participant (not current user)
        const otherParticipantId = threadData.participants.find(
          (participantId: string) => participantId !== currentUser.uid
        );
        
        if (otherParticipantId && otherParticipantId !== 'system') {
          const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
          if (userDoc.exists()) {
            setChatPartner({ id: userDoc.id, ...userDoc.data() });
            
            // Check friend status
            const friendQuery = query(
              friendsCollection,
              where('userId', 'in', [currentUser.uid, otherParticipantId]),
              where('friendId', 'in', [currentUser.uid, otherParticipantId])
            );
            
            const friendSnapshot = await getDocs(friendQuery);
            if (!friendSnapshot.empty) {
              const friendData = friendSnapshot.docs[0].data() as Friend;
              setFriendStatus(friendData.status as 'pending' | 'accepted');
            }
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching chat thread:', error);
        setIsLoading(false);
      }
    };
    
    fetchChatThread();
    
    // Subscribe to messages for this chat thread
    const q = query(
      collection(db, 'chat_messages'),
      where('threadId', '==', id),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(newMessages);
      
      // Mark messages as read
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        if (
          messageData.senderId !== currentUser.uid && 
          !messageData.read
        ) {
          updateDoc(doc.ref, { read: true });
        }
      });
    });
    
    return () => unsubscribe();
  }, [currentUser, id, setLocation]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || isSending) return;
    
    setIsSending(true);
    
    try {
      // Add new message
      await addDoc(chatMessagesCollection, {
        threadId: id,
        senderId: currentUser.uid,
        receiverId: chatPartner.id,
        content: newMessage,
        type: 'text',
        read: false,
        createdAt: Date.now()
      });
      
      // Update thread with last message
      await updateDoc(doc(chatThreadsCollection, id), {
        lastMessage: {
          content: newMessage,
          senderId: currentUser.uid,
          createdAt: Date.now()
        },
        updatedAt: Date.now()
      });
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!currentUser || !chatPartner) return;
    
    try {
      // Add friend request
      await addDoc(friendsCollection, {
        userId: currentUser.uid,
        friendId: chatPartner.id,
        status: 'pending',
        createdAt: Date.now()
      });
      
      // Add system message about friend request
      await addDoc(chatMessagesCollection, {
        threadId: id,
        senderId: 'system',
        content: `${currentUser.displayName} sent a friend request`,
        type: 'friend_request',
        read: true,
        createdAt: Date.now()
      });
      
      setFriendStatus('pending');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const acceptFriendRequest = async () => {
    if (!currentUser || !chatPartner) return;
    
    try {
      // Find the friend request
      const friendQuery = query(
        friendsCollection,
        where('userId', '==', chatPartner.id),
        where('friendId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(friendQuery);
      if (!querySnapshot.empty) {
        // Update status to accepted
        await updateDoc(doc(friendsCollection, querySnapshot.docs[0].id), {
          status: 'accepted'
        });
        
        // Add system message
        await addDoc(chatMessagesCollection, {
          threadId: id,
          senderId: 'system',
          content: `${currentUser.displayName} accepted the friend request`,
          type: 'system',
          read: true,
          createdAt: Date.now()
        });
        
        setFriendStatus('accepted');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const declineFriendRequest = async () => {
    if (!currentUser || !chatPartner) return;
    
    try {
      // Find the friend request
      const friendQuery = query(
        friendsCollection,
        where('userId', '==', chatPartner.id),
        where('friendId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(friendQuery);
      if (!querySnapshot.empty) {
        // Update status to rejected
        await updateDoc(doc(friendsCollection, querySnapshot.docs[0].id), {
          status: 'rejected'
        });
        
        setFriendStatus('none');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  const goBackToChats = () => {
    setLocation('/chat');
  };

  // Format date for message groups
  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
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
    <div id="individual-chat" className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center p-3 border-b">
        <Button onClick={goBackToChats} variant="ghost" className="p-1 mr-2">
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </Button>
        <div className="relative">
          <Avatar className="w-10 h-10">
            {chatPartner?.photoURL ? (
              <AvatarImage src={chatPartner.photoURL} alt={chatPartner?.displayName || 'User'} />
            ) : (
              <AvatarFallback>{chatPartner?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            )}
          </Avatar>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            chatType === 'bluetooth' ? 'bg-blue-500' :
            chatPartner?.status === 'online' ? 'bg-green-500' : 
            chatPartner?.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
          }`}></span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="font-medium">{chatPartner?.displayName || 'Unknown User'}</h3>
          <p className="text-gray-500 text-xs">
            {chatType === 'bluetooth' ? 'Bluetooth • Nearby' : 
             chatPartner?.status === 'online' ? 'Online' : 
             chatPartner?.status === 'busy' ? 'Busy' : 'Offline'}
          </p>
        </div>
        <div>
          <Button variant="ghost" className="p-2 text-gray-600">
            <MoreVertical className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {/* Group messages by date */}
            {(() => {
              let lastDate = '';
              
              return messages.map((message, index) => {
                const messageDate = formatMessageDate(message.createdAt);
                const showDateHeader = messageDate !== lastDate;
                
                if (showDateHeader) {
                  lastDate = messageDate;
                }
                
                const isCurrentUser = message.senderId === currentUser?.uid;
                const isSystemMessage = message.senderId === 'system';
                const isFriendRequest = message.type === 'friend_request';
                
                return (
                  <div key={message.id}>
                    {/* Date header */}
                    {showDateHeader && (
                      <div className="text-center mb-3">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {messageDate}
                        </span>
                      </div>
                    )}
                    
                    {/* System message */}
                    {isSystemMessage && !isFriendRequest && (
                      <div className="text-center">
                        <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          {message.content}
                        </span>
                      </div>
                    )}
                    
                    {/* Friend request */}
                    {isFriendRequest && (
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-blue-800 mb-2">{message.content}</p>
                        {friendStatus === 'pending' && chatPartner?.id && message.content?.includes(chatPartner.displayName) && (
                          <div className="flex space-x-3">
                            <Button 
                              onClick={declineFriendRequest}
                              className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium"
                              variant="secondary"
                            >
                              Decline
                            </Button>
                            <Button 
                              onClick={acceptFriendRequest}
                              className="flex-1 py-2 bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white rounded-full text-sm font-medium"
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Normal message */}
                    {!isSystemMessage && !isFriendRequest && (
                      <div className={`flex items-end ${isCurrentUser ? 'justify-end' : ''}`}>
                        <div className={`${
                          isCurrentUser 
                            ? 'bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white rounded-lg rounded-br-none' 
                            : 'bg-gray-200 text-gray-800 rounded-lg rounded-bl-none'
                          } p-3 max-w-[75%]`}
                        >
                          <p>{message.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
            
            {/* Friend request or send one if needed */}
            {chatType === 'bluetooth' && friendStatus === 'none' && (
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-sm text-blue-800 mb-2">Would you like to become friends?</p>
                <Button 
                  onClick={sendFriendRequest}
                  className="py-2 bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white rounded-full text-sm font-medium px-6"
                >
                  Send Friend Request
                </Button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t">
        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <Button type="button" variant="ghost" className="p-2 text-gray-500">
            <SmileIcon className="h-6 w-6" />
          </Button>
          <Input 
            type="text"
            placeholder="Type a message..." 
            className="flex-1 bg-transparent px-3 py-2 outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
          />
          <Button type="button" variant="ghost" className="p-2 text-gray-500">
            <ImageIcon className="h-6 w-6" />
          </Button>
          <Button 
            type="submit"
            className="ml-1 p-2 bg-gradient-to-r from-[#FF5252] to-[#FF1744] rounded-full"
            disabled={!newMessage.trim() || isSending}
          >
            <SendIcon className="h-6 w-6 text-white" />
          </Button>
        </div>
      </form>
    </div>
  );
}
