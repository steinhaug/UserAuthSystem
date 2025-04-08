import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageDelivery } from './use-message-delivery';
import { DEVELOPMENT_MODE } from '@/lib/constants';

// Message type with status tracking for UI
export interface ChatMessageWithStatus {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  senderName?: string;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
}

// Return type for the hook
interface ChatWebSocketReturn {
  messages: Record<string, ChatMessageWithStatus[]>;
  pendingMessages: string[];
  isConnected: boolean;
  sendMessage: (threadId: string, recipientId: string, content: string) => void;
  resendMessage: (messageId: string, threadId: string, recipientId: string, content: string) => void;
}

export function useChatWebSocket(): ChatWebSocketReturn {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Record<string, ChatMessageWithStatus[]>>({});
  const [isConnected, setIsConnected] = useState(DEVELOPMENT_MODE); // In dev mode, always appear connected
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  // Use our message delivery tracking hook
  const { messageStatuses, pendingMessages, trackMessage, resendMessage: resendMessageDelivery } = useMessageDelivery();
  
  // Connect to WebSocket server in production mode
  useEffect(() => {
    if (!currentUser || DEVELOPMENT_MODE) {
      if (DEVELOPMENT_MODE) {
        console.log('Chat websocket disabled in development mode, using simulated messages');
        
        // In development mode, populate with demo messages
        setMessages({
          'demo-thread': [
            {
              id: 'demo-1',
              content: 'Hello! Welcome to the enhanced chat demo.',
              senderId: 'system',
              recipientId: currentUser?.uid || 'current-user',
              timestamp: Date.now() - 3600000, // 1 hour ago
              status: 'delivered',
              senderName: 'System'
            },
            {
              id: 'demo-2',
              content: 'This chat simulates message delivery status tracking.',
              senderId: 'system',
              recipientId: currentUser?.uid || 'current-user',
              timestamp: Date.now() - 1800000, // 30 min ago
              status: 'read',
              senderName: 'System'
            },
            {
              id: 'demo-3',
              content: 'Try sending a message to see delivery status updates!',
              senderId: 'system',
              recipientId: currentUser?.uid || 'current-user',
              timestamp: Date.now() - 60000, // 1 min ago
              status: 'delivered',
              senderName: 'System'
            }
          ]
        });
      }
      return;
    }
    
    // Production mode WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    // Connection opened handler
    ws.addEventListener('open', () => {
      console.log('Chat WebSocket connected');
      setIsConnected(true);
      
      // Authenticate
      ws.send(JSON.stringify({
        type: 'authenticate',
        token: currentUser.uid
      }));
      
      // Request message history
      ws.send(JSON.stringify({
        type: 'get_messages'
      }));
    });
    
    // Message received handler
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle message history
        if (data.type === 'message_history') {
          // Group messages by thread ID
          const messagesByThread: Record<string, ChatMessageWithStatus[]> = {};
          
          // Process messages
          if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach((msg: any) => {
              const threadId = msg.threadId || 'default';
              
              if (!messagesByThread[threadId]) {
                messagesByThread[threadId] = [];
              }
              
              messagesByThread[threadId].push({
                id: msg.id.toString(),
                content: msg.content,
                senderId: msg.senderId,
                recipientId: msg.recipientId,
                timestamp: new Date(msg.timestamp || msg.createdAt).getTime(),
                status: msg.status || 'delivered',
                senderName: msg.senderName
              });
            });
          }
          
          setMessages(messagesByThread);
        }
        
        // Handle new message
        else if (data.type === 'new_message') {
          const { message } = data;
          const threadId = message.threadId || 'default';
          
          // Update messages
          setMessages(prev => {
            const updatedMessages = { ...prev };
            
            if (!updatedMessages[threadId]) {
              updatedMessages[threadId] = [];
            }
            
            // Add new message
            updatedMessages[threadId] = [
              ...updatedMessages[threadId], 
              {
                id: message.id.toString(),
                content: message.content,
                senderId: message.senderId,
                recipientId: message.recipientId,
                timestamp: new Date(message.timestamp || message.createdAt).getTime(),
                status: message.status || 'delivered',
                senderName: message.senderName
              }
            ];
            
            return updatedMessages;
          });
          
          // If this is not our message, mark as delivered
          if (message.senderId !== currentUser.uid) {
            ws.send(JSON.stringify({
              type: 'message_received',
              messageId: message.id.toString()
            }));
          }
        }
        
      } catch (error) {
        console.error('Error processing chat WebSocket message:', error);
      }
    });
    
    // Error handler
    ws.addEventListener('error', (error) => {
      console.error('Chat WebSocket error:', error);
      setIsConnected(false);
    });
    
    // Close handler
    ws.addEventListener('close', () => {
      console.log('Chat WebSocket connection closed');
      setIsConnected(false);
    });
    
    setSocket(ws);
    
    // Cleanup
    return () => {
      ws.close();
    };
  }, [currentUser]);
  
  // Keep track of message statuses and update message status in our state
  useEffect(() => {
    // Update message statuses based on delivery tracking
    Object.entries(messageStatuses).forEach(([messageId, status]) => {
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        // Find the message in all threads
        Object.keys(updatedMessages).forEach(threadId => {
          const messageIndex = updatedMessages[threadId].findIndex(
            msg => msg.id === messageId
          );
          
          // Update message status if found
          if (messageIndex !== -1) {
            updatedMessages[threadId] = [
              ...updatedMessages[threadId].slice(0, messageIndex),
              {
                ...updatedMessages[threadId][messageIndex],
                status: status.status
              },
              ...updatedMessages[threadId].slice(messageIndex + 1)
            ];
          }
        });
        
        return updatedMessages;
      });
    });
  }, [messageStatuses]);
  
  // Keep connection alive with heartbeat
  useEffect(() => {
    if (!socket || !isConnected || DEVELOPMENT_MODE) return;
    
    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [socket, isConnected]);
  
  // Send message function
  const sendMessage = useCallback((
    threadId: string,
    recipientId: string,
    content: string
  ) => {
    if (!content.trim()) return;
    
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // In development mode, simulate sending
    if (DEVELOPMENT_MODE) {
      // Add message to UI immediately
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        if (!updatedMessages[threadId]) {
          updatedMessages[threadId] = [];
        }
        
        // Add new message with pending status
        updatedMessages[threadId] = [
          ...updatedMessages[threadId],
          {
            id: messageId,
            content,
            senderId: currentUser?.uid || 'current-user',
            recipientId,
            timestamp: Date.now(),
            status: 'pending',
            senderName: currentUser?.displayName || 'You'
          }
        ];
        
        return updatedMessages;
      });
      
      // Track with message delivery
      trackMessage(messageId);
      
      return;
    }
    
    // Production behavior
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Add message to UI immediately with pending status
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        if (!updatedMessages[threadId]) {
          updatedMessages[threadId] = [];
        }
        
        updatedMessages[threadId] = [
          ...updatedMessages[threadId],
          {
            id: messageId,
            content,
            senderId: currentUser?.uid || 'current-user',
            recipientId,
            timestamp: Date.now(),
            status: 'pending',
            senderName: currentUser?.displayName || 'You'
          }
        ];
        
        return updatedMessages;
      });
      
      // Send via WebSocket
      socket.send(JSON.stringify({
        type: 'chat_message',
        messageId,
        threadId,
        recipientId,
        content
      }));
      
      // Track with message delivery
      trackMessage(messageId);
    } else {
      // WebSocket not connected, add as failed
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        if (!updatedMessages[threadId]) {
          updatedMessages[threadId] = [];
        }
        
        updatedMessages[threadId] = [
          ...updatedMessages[threadId],
          {
            id: messageId,
            content,
            senderId: currentUser?.uid || 'current-user',
            recipientId,
            timestamp: Date.now(),
            status: 'failed',
            senderName: currentUser?.displayName || 'You'
          }
        ];
        
        return updatedMessages;
      });
    }
  }, [currentUser, socket, trackMessage]);
  
  // Resend message function
  const resendMessage = useCallback((
    messageId: string,
    threadId: string,
    recipientId: string,
    content: string
  ) => {
    // Update UI first
    setMessages(prev => {
      const updatedMessages = { ...prev };
      
      // Find the message
      const threadMessages = updatedMessages[threadId] || [];
      const messageIndex = threadMessages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex !== -1) {
        // Update status to pending
        threadMessages[messageIndex] = {
          ...threadMessages[messageIndex],
          status: 'pending'
        };
        
        updatedMessages[threadId] = [...threadMessages];
      }
      
      return updatedMessages;
    });
    
    // Use delivery tracking to resend
    resendMessageDelivery(messageId, content, recipientId, threadId);
  }, [resendMessageDelivery]);
  
  return {
    messages,
    pendingMessages,
    isConnected,
    sendMessage,
    resendMessage
  };
}