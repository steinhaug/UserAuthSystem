import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEVELOPMENT_MODE } from '@/lib/constants';

type MessageHandler = (data: any) => void;

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketReturn {
  connected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: any;
}

export function useWebSocket(onMessage?: MessageHandler): UseWebSocketReturn {
  const { currentUser } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<string, MessageHandler>>(new Map());
  
  // Register message handlers
  const registerMessageHandler = useCallback((messageType: string, handler: MessageHandler) => {
    messageHandlersRef.current.set(messageType, handler);
    return () => {
      messageHandlersRef.current.delete(messageType);
    };
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    if (DEVELOPMENT_MODE) {
      console.log('WebSocket disabled in development mode');
      return () => {};
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      
      // Authenticate with the server if we have a user
      if (currentUser) {
        currentUser.getIdToken().then(token => {
          socket.send(JSON.stringify({
            type: 'authenticate',
            token
          }));
        });
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        // Update last message state
        setLastMessage(data);
        
        // Call the general onMessage handler if provided
        if (onMessage) {
          onMessage(data);
        }
        
        // Call specific handler for this message type if registered
        const messageType = data.type;
        if (messageType && messageHandlersRef.current.has(messageType)) {
          const handler = messageHandlersRef.current.get(messageType);
          if (handler) {
            handler(data);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, [currentUser, onMessage]);
  
  // Function to send messages through the WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }, []);
  
  // Return the API
  return {
    connected,
    sendMessage,
    lastMessage,
  };
}

export function useSubscribeToMessageType(messageType: string, handler: MessageHandler) {
  const { connected, sendMessage, lastMessage } = useWebSocket();
  const messageHandlersRef = useRef<Map<string, MessageHandler>>(new Map());
  
  useEffect(() => {
    messageHandlersRef.current.set(messageType, handler);
    
    return () => {
      messageHandlersRef.current.delete(messageType);
    };
  }, [messageType, handler]);
  
  useEffect(() => {
    if (lastMessage && lastMessage.type === messageType) {
      handler(lastMessage);
    }
  }, [lastMessage, messageType, handler]);
  
  return { connected, sendMessage };
}

// Example usage in a component:
// 
// function ChatComponent() {
//   const { connected, sendMessage, lastMessage } = useWebSocket();
// 
//   const sendChatMessage = (content) => {
//     sendMessage({
//       type: 'chat_message',
//       threadId: '123',
//       content,
//       recipientId: 'user456'
//     });
//   };
// 
//   return (
//     <div>
//       <p>Connected: {connected ? 'Yes' : 'No'}</p>
//       <button onClick={() => sendChatMessage('Hello!')}>Send Message</button>
//       {lastMessage && <p>Last message: {JSON.stringify(lastMessage)}</p>}
//     </div>
//   );
// }