import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import ChatList from './ChatList';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { chatThreadsCollection } from '@/lib/firebase';
import { ChatThread } from '@/types';

export default function ChatView() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
      return;
    }

    // Subscribe to chat threads where the current user is a participant
    const q = query(
      chatThreadsCollection,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threads: ChatThread[] = [];
      snapshot.forEach((doc) => {
        threads.push({ id: doc.id, ...doc.data() } as ChatThread);
      });
      setChatThreads(threads);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching chat threads:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, setLocation]);

  return (
    <div className="h-full pb-16">
      <ChatList 
        chatThreads={chatThreads} 
        isLoading={isLoading} 
      />
    </div>
  );
}
