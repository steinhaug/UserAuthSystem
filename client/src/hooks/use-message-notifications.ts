import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { DEVELOPMENT_MODE } from '@/lib/constants';

interface MessageNotification {
  messageId: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
}

interface MessageNotificationsReturn {
  notifications: MessageNotification[];
  markNotificationAsRead: (messageId: string) => void;
  clearNotifications: () => void;
}

export function useMessageNotifications(): MessageNotificationsReturn {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Connect to WebSocket server
  useEffect(() => {
    if (!currentUser || DEVELOPMENT_MODE) {
      // In development mode, don't establish a real WebSocket connection
      if (DEVELOPMENT_MODE) {
        console.log('Message notifications disabled in development mode');
        
        // In development mode, create a mock notification for demo purposes
        const mockNotification: MessageNotification = {
          messageId: `mock-${Date.now()}`,
          threadId: 'demo-thread',
          senderId: 'demo-user',
          content: 'This is a simulated notification in development mode',
          timestamp: Date.now(),
          status: 'delivered',
        };
        
        setTimeout(() => {
          setNotifications(prev => [...prev, mockNotification]);
          
          // Show toast notification
          toast({
            title: 'New Message (Demo)',
            description: mockNotification.content,
            duration: 5000,
          });
        }, 5000); // Show after 5 seconds for demo purposes
      }
      
      return;
    }

    // Create WebSocket connection in production mode
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    // Connection opened event handler
    ws.addEventListener('open', () => {
      console.log('WebSocket notifications connection established');
      
      // Authenticate with the server
      ws.send(JSON.stringify({
        type: 'authenticate',
        token: currentUser.uid, // Firebase UID as token
      }));
    });

    // Listen for messages
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle new message notification
        if (data.type === 'new_message') {
          const { message } = data;
          
          // Add to notifications if it's not from the current user
          if (message.senderId !== currentUser.uid) {
            const notification: MessageNotification = {
              messageId: message.id.toString(),
              threadId: message.threadId,
              senderId: message.senderId,
              content: message.content,
              timestamp: Date.now(),
              status: message.status || 'delivered',
            };
            
            setNotifications(prev => [...prev, notification]);
            
            // Show toast notification
            toast({
              title: 'New Message',
              description: message.content.length > 50 
                ? `${message.content.substring(0, 50)}...` 
                : message.content,
              duration: 5000,
            });
            
            // Mark as delivered on the server
            ws.send(JSON.stringify({
              type: 'message_received',
              messageId: message.id.toString(),
            }));
          }
        }
        
        // Handle message read acknowledgment
        else if (data.type === 'message_read') {
          // Update UI for read messages if needed
          console.log(`Message ${data.messageId} was read`);
        }
        
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Connection error event handler
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Connection closed event handler
    ws.addEventListener('close', () => {
      console.log('WebSocket connection closed');
    });

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [currentUser, toast]);

  // Set up heartbeat to keep connection alive
  useEffect(() => {
    if (!socket || DEVELOPMENT_MODE) return;
    
    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now(),
        }));
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [socket]);

  // Function to mark a notification as read
  const markNotificationAsRead = useCallback((messageId: string) => {
    // In development mode, update local state only
    if (DEVELOPMENT_MODE) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.messageId === messageId 
            ? { ...notif, status: 'read' } 
            : notif
        )
      );
      return;
    }
    
    // Production behavior
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'mark_message_read',
        messageId,
      }));
      
      // Update local notifications state
      setNotifications(prev => 
        prev.map(notif => 
          notif.messageId === messageId 
            ? { ...notif, status: 'read' } 
            : notif
        )
      );
    }
  }, [socket]);

  // Function to clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { 
    notifications, 
    markNotificationAsRead, 
    clearNotifications 
  };
}