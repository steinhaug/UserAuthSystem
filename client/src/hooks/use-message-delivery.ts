import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEVELOPMENT_MODE } from '@/lib/constants';

interface MessageDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
  updatedAt?: number;
}

interface MessageDeliveryReturn {
  messageStatuses: Record<string, MessageDeliveryStatus>;
  pendingMessages: string[];
  trackMessage: (messageId: string) => void;
  resendMessage: (messageId: string, content: string, recipientId: string, threadId: string) => void;
}

export function useMessageDelivery(): MessageDeliveryReturn {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, MessageDeliveryStatus>>({});
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  // Connect to WebSocket server
  useEffect(() => {
    if (!currentUser || DEVELOPMENT_MODE) {
      // In development mode, don't establish a real WebSocket connection
      if (DEVELOPMENT_MODE) {
        console.log('Message delivery tracking disabled in development mode');
      }
      return;
    }

    // Create WebSocket connection for production mode
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    // Connection opened event handler
    ws.addEventListener('open', () => {
      console.log('WebSocket delivery tracking connection established');
      
      // Authenticate with the server
      ws.send(JSON.stringify({
        type: 'authenticate',
        token: currentUser.uid, // Firebase UID as token
      }));

      // Request pending messages from server
      ws.send(JSON.stringify({
        type: 'get_pending_messages'
      }));
    });

    // Listen for messages
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle message sent confirmation
        if (data.type === 'message_sent') {
          if (data.success) {
            setMessageStatuses(prev => ({
              ...prev,
              [data.messageId]: {
                messageId: data.messageId,
                status: 'sent',
                updatedAt: data.timestamp
              }
            }));
          } else {
            // Handle failed message
            const failedMessageId = data.messageId;
            setMessageStatuses(prev => ({
              ...prev,
              [failedMessageId]: {
                messageId: failedMessageId,
                status: 'failed',
                updatedAt: Date.now()
              }
            }));
          }
        }
        
        // Handle message delivered confirmation
        else if (data.type === 'message_delivered') {
          setMessageStatuses(prev => ({
            ...prev,
            [data.messageId]: {
              messageId: data.messageId,
              status: 'delivered',
              updatedAt: data.timestamp
            }
          }));
        }
        
        // Handle message read confirmation
        else if (data.type === 'message_read') {
          setMessageStatuses(prev => ({
            ...prev,
            [data.messageId]: {
              messageId: data.messageId,
              status: 'read',
              updatedAt: data.timestamp
            }
          }));
        }
        
        // Handle pending messages list
        else if (data.type === 'pending_messages') {
          if (data.messages && Array.isArray(data.messages)) {
            // Update pending messages state
            const pendingIds = data.messages.map((msg: any) => msg.id.toString());
            setPendingMessages(pendingIds);
            
            // Update message statuses
            const statusUpdates: Record<string, MessageDeliveryStatus> = {};
            data.messages.forEach((msg: any) => {
              statusUpdates[msg.id.toString()] = {
                messageId: msg.id.toString(),
                status: 'pending',
                updatedAt: new Date(msg.updatedAt || msg.createdAt).getTime()
              };
            });
            
            setMessageStatuses(prev => ({
              ...prev,
              ...statusUpdates
            }));
          }
        }
        
      } catch (error) {
        console.error('Error processing WebSocket delivery message:', error);
      }
    });

    // Connection error event handler
    ws.addEventListener('error', (error) => {
      console.error('WebSocket delivery tracking error:', error);
    });

    // Connection closed event handler
    ws.addEventListener('close', () => {
      console.log('WebSocket delivery tracking connection closed');
    });

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [currentUser]);

  // Function to track a new message
  const trackMessage = useCallback((messageId: string) => {
    // In development mode, simulate status changes over time
    if (DEVELOPMENT_MODE) {
      // Set as sent immediately
      setMessageStatuses(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          status: 'sent',
          updatedAt: Date.now()
        }
      }));
      
      // Simulate delivered after 1 second
      setTimeout(() => {
        setMessageStatuses(prev => ({
          ...prev,
          [messageId]: {
            messageId,
            status: 'delivered',
            updatedAt: Date.now()
          }
        }));
      }, 1000);
      
      // Simulate read after 2 seconds
      setTimeout(() => {
        setMessageStatuses(prev => ({
          ...prev,
          [messageId]: {
            messageId,
            status: 'read',
            updatedAt: Date.now()
          }
        }));
      }, 2000);
      
      return;
    }
    
    // Production behavior
    setMessageStatuses(prev => ({
      ...prev,
      [messageId]: {
        messageId,
        status: 'sent',
        updatedAt: Date.now()
      }
    }));
  }, []);

  // Function to resend a failed or pending message
  const resendMessage = useCallback((
    messageId: string, 
    content: string,
    recipientId: string,
    threadId: string
  ) => {
    // In development mode, simulate a successful resend
    if (DEVELOPMENT_MODE) {
      // Update status to indicate we're trying again
      setMessageStatuses(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          status: 'pending',
          updatedAt: Date.now()
        }
      }));
      
      // After a delay, mark as sent
      setTimeout(() => {
        setMessageStatuses(prev => ({
          ...prev,
          [messageId]: {
            messageId,
            status: 'sent',
            updatedAt: Date.now()
          }
        }));
        
        // Then mark as delivered
        setTimeout(() => {
          setMessageStatuses(prev => ({
            ...prev,
            [messageId]: {
              messageId,
              status: 'delivered',
              updatedAt: Date.now()
            }
          }));
        }, 1000);
      }, 500);
      
      return;
    }
    
    // Production behavior
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Update status to indicate we're trying again
      setMessageStatuses(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          status: 'pending',
          updatedAt: Date.now()
        }
      }));
      
      // Send the message again
      socket.send(JSON.stringify({
        type: 'chat_message',
        threadId,
        recipientId,
        content,
        originalMessageId: messageId
      }));
    }
  }, [socket]);

  return {
    messageStatuses,
    pendingMessages,
    trackMessage,
    resendMessage
  };
}