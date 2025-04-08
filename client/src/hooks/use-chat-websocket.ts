import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from './use-websocket';
import { DEVELOPMENT_MODE } from '@/lib/constants';

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  sentAt: Date;
  isRead: boolean;
}

interface UseChatWebSocketReturn {
  sendMessage: (threadId: string, recipientId: string, content: string) => void;
  messages: Record<string, ChatMessage[]>; // threadId -> messages
  isConnected: boolean;
}

export function useChatWebSocket(): UseChatWebSocketReturn {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const { connected, sendMessage: wsSendMessage } = useWebSocket(handleWebSocketMessage);
  
  // Handle incoming WebSocket messages
  function handleWebSocketMessage(data: any) {
    if (data.type === 'new_message' && data.message) {
      const { threadId } = data.message;
      
      setMessages(prevMessages => {
        const threadMessages = prevMessages[threadId] || [];
        
        // Check if we already have this message (prevents duplicates)
        if (!threadMessages.some(msg => msg.id === data.message.id)) {
          return {
            ...prevMessages,
            [threadId]: [...threadMessages, formatMessage(data.message)]
          };
        }
        
        return prevMessages;
      });
    }
  }
  
  // Format incoming message objects
  const formatMessage = useCallback((message: any): ChatMessage => {
    return {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      content: message.content,
      sentAt: new Date(message.sentAt),
      isRead: message.isRead || false
    };
  }, []);
  
  // Function to send a chat message
  const sendMessage = useCallback((threadId: string, recipientId: string, content: string) => {
    if (DEVELOPMENT_MODE) {
      // In development mode, simulate sending/receiving messages locally
      const mockMessage: ChatMessage = {
        id: `mock-${Date.now()}`,
        threadId,
        senderId: currentUser?.uid || 'unknown',
        content,
        sentAt: new Date(),
        isRead: false
      };
      
      setMessages(prevMessages => {
        const threadMessages = prevMessages[threadId] || [];
        return {
          ...prevMessages,
          [threadId]: [...threadMessages, mockMessage]
        };
      });
      
      // Simulate a response after a delay
      setTimeout(() => {
        const mockResponse: ChatMessage = {
          id: `mock-response-${Date.now()}`,
          threadId,
          senderId: recipientId,
          content: `Auto-reply to: ${content}`,
          sentAt: new Date(),
          isRead: false
        };
        
        setMessages(prevMessages => {
          const threadMessages = prevMessages[threadId] || [];
          return {
            ...prevMessages,
            [threadId]: [...threadMessages, mockResponse]
          };
        });
      }, 1000);
      
      return;
    }
    
    // In production mode, send the message through WebSocket
    if (connected) {
      wsSendMessage({
        type: 'chat_message',
        threadId,
        recipientId,
        content
      });
      
      // Optimistically add the message to the state
      const pendingMessage: ChatMessage = {
        id: `pending-${Date.now()}`,
        threadId,
        senderId: currentUser?.uid || 'unknown',
        content,
        sentAt: new Date(),
        isRead: false
      };
      
      setMessages(prevMessages => {
        const threadMessages = prevMessages[threadId] || [];
        return {
          ...prevMessages,
          [threadId]: [...threadMessages, pendingMessage]
        };
      });
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }, [connected, currentUser, wsSendMessage]);
  
  // Load initial messages from API when component mounts
  useEffect(() => {
    if (!currentUser) return;
    
    const loadMessages = async () => {
      try {
        // In a real app, fetch chat threads from the API
        if (!DEVELOPMENT_MODE) {
          // Example API call to load messages
          // const response = await fetch('/api/chat/threads');
          // const threads = await response.json();
          
          // Process and set messages from each thread
          // ... 
        } else {
          // In development mode, use mock data
          const mockThreadId = 'mock-thread-1';
          const mockMessages: ChatMessage[] = [
            {
              id: 'mock-1',
              threadId: mockThreadId,
              senderId: 'mock-user-1',
              content: 'Hello! This is a mock message.',
              sentAt: new Date(Date.now() - 3600000), // 1 hour ago
              isRead: true
            },
            {
              id: 'mock-2',
              threadId: mockThreadId,
              senderId: currentUser.uid,
              content: 'Hi there! This is a response.',
              sentAt: new Date(Date.now() - 3500000), // 58 minutes ago
              isRead: true
            }
          ];
          
          setMessages({
            [mockThreadId]: mockMessages
          });
        }
      } catch (error) {
        console.error('Error loading chat messages:', error);
      }
    };
    
    loadMessages();
  }, [currentUser]);
  
  return {
    sendMessage,
    messages,
    isConnected: connected
  };
}