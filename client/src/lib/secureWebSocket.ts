/**
 * Secure WebSocket service with end-to-end encryption
 */
import { 
  ensureUserHasKeyPair, 
  encryptMessage, 
  decryptMessage, 
  getSharedKey,
  encryptWithPublicKey 
} from './encryption';

// Map to store shared keys for each conversation
const sharedKeyCache: { [userId: string]: Uint8Array } = {};

// Keep a registry of public keys by user ID
const publicKeyRegistry: { [userId: string]: string } = {};

// WebSocket instance
let ws: WebSocket | null = null;
let isConnected = false;
let isAuthenticated = false;
let reconnectTimer: NodeJS.Timeout | null = null;
const MAX_RECONNECT_DELAY = 10000; // 10 seconds
let reconnectAttempts = 0;

// Event listeners
const messageListeners: { [type: string]: ((data: any) => void)[] } = {};
const stateChangeListeners: ((isConnected: boolean) => void)[] = [];

// Current user ID (set during connection setup)
let currentUserId: string | null = null;

/**
 * Initialize WebSocket connection
 */
export const initializeWebSocket = (authToken: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Clear any existing connection
    if (ws) {
      try {
        ws.close();
      } catch (e) {}
    }

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    ws = new WebSocket(wsUrl);

    // Listen for connection open
    ws.addEventListener('open', async () => {
      console.log('WebSocket connection established');
      isConnected = true;
      
      // Authenticate
      if (authToken) {
        ws?.send(JSON.stringify({
          type: 'authenticate',
          token: authToken
        }));
      }
      
      notifyStateChange(true);
      reconnectAttempts = 0;
    });

    // Listen for messages
    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle authentication confirmation
        if (data.type === 'authentication_result' && data.success) {
          isAuthenticated = true;
          currentUserId = data.userId;
          
          // Ensure user has encryption keys
          if (currentUserId) {
            await ensureUserHasKeyPair(currentUserId);
          }
          
          // Let listeners know about connection
          resolve();
          
          // Notify listeners of this specific message type
          notifyListeners('authentication_result', data);
        }
        // Handle incoming encrypted message
        else if (data.type === 'new_message' && data.message) {
          handleIncomingMessage(data);
        }
        // Handle other message types
        else {
          notifyListeners(data.type, data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        reject(error);
      }
    });

    // Handle connection close
    ws.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      isConnected = false;
      isAuthenticated = false;
      notifyStateChange(false);
      scheduleReconnect();
    });

    // Handle errors
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      isConnected = false;
      notifyStateChange(false);
      reject(error);
    });
  });
};

/**
 * Send an encrypted message to another user
 */
export const sendSecureMessage = async (
  threadId: string,
  recipientId: string,
  content: string,
  contentType: 'text' | 'image' | 'audio' | 'video' = 'text',
  metadata?: any
): Promise<void> => {
  if (!ws || !isConnected || !isAuthenticated || !currentUserId) {
    throw new Error('WebSocket not connected or authenticated');
  }

  try {
    // Get or request recipient's public key if we don't have a shared key
    if (!sharedKeyCache[recipientId]) {
      // First, check if we have their public key in the registry
      if (!publicKeyRegistry[recipientId]) {
        // Request the public key
        ws.send(JSON.stringify({
          type: 'request_public_key',
          recipientId
        }));
        
        // Wait for the key to be received
        await new Promise((resolve) => {
          const listener = (data: any) => {
            if (data.userId === recipientId && data.publicKey) {
              publicKeyRegistry[recipientId] = data.publicKey;
              // Remove this listener
              removeListener('public_key', listener);
              resolve(null);
            }
          };
          
          addListener('public_key', listener);
          
          // Add timeout
          setTimeout(() => {
            removeListener('public_key', listener);
            resolve(null);
          }, 5000);
        });
      }
      
      // Now that we have the public key, create a shared key
      if (publicKeyRegistry[recipientId]) {
        const myKeys = await ensureUserHasKeyPair(currentUserId);
        sharedKeyCache[recipientId] = getSharedKey(
          myKeys.privateKey,
          publicKeyRegistry[recipientId]
        );
      } else {
        throw new Error('Could not get recipient public key');
      }
    }
    
    // Encrypt the message content
    const encryptedContent = encryptMessage(
      JSON.stringify({
        content,
        contentType,
        metadata,
        timestamp: Date.now()
      }),
      sharedKeyCache[recipientId]
    );
    
    // Send the encrypted message
    ws.send(JSON.stringify({
      type: 'chat_message',
      threadId,
      recipientId,
      content: encryptedContent,
      isEncrypted: true
    }));
  } catch (error) {
    console.error('Error sending secure message:', error);
    throw error;
  }
};

/**
 * Handle incoming messages, including decryption
 */
const handleIncomingMessage = async (data: any) => {
  try {
    if (!currentUserId) return;
    
    const message = data.message;
    const isEncrypted = message.isEncrypted === true;
    
    // Message needs decryption
    if (isEncrypted && message.content) {
      // Get sender ID
      const senderId = message.senderId;
      
      // Ensure we have a shared key
      if (!sharedKeyCache[senderId]) {
        // We need to create a shared key using our private key and sender's public key
        if (publicKeyRegistry[senderId]) {
          const myKeys = await ensureUserHasKeyPair(currentUserId);
          sharedKeyCache[senderId] = getSharedKey(
            myKeys.privateKey,
            publicKeyRegistry[senderId]
          );
        } else {
          console.error('Cannot decrypt message: Missing sender public key');
          // You might want to request the public key here
          return;
        }
      }
      
      // Decrypt the content
      const decryptedContent = decryptMessage(
        message.content,
        sharedKeyCache[senderId]
      );
      
      if (decryptedContent) {
        // Parse the decrypted JSON content
        try {
          const parsed = JSON.parse(decryptedContent);
          // Create a new message object with decrypted content
          const decryptedMessage = {
            ...message,
            content: parsed.content,
            contentType: parsed.contentType || 'text',
            metadata: parsed.metadata,
            originalTimestamp: parsed.timestamp,
            isEncrypted: false, // Mark as already decrypted
            decryptedAt: Date.now()
          };
          
          // Notify listeners with the decrypted message
          notifyListeners('new_message', {
            ...data,
            message: decryptedMessage
          });
        } catch (e) {
          console.error('Error parsing decrypted message:', e);
        }
      } else {
        console.error('Failed to decrypt message');
      }
    } else {
      // Message is not encrypted, pass it through
      notifyListeners('new_message', data);
    }
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
};

/**
 * Share public key with the server for key exchange
 */
export const sharePublicKey = async (): Promise<void> => {
  if (!ws || !isConnected || !isAuthenticated || !currentUserId) {
    throw new Error('WebSocket not connected or authenticated');
  }
  
  try {
    const keyPair = await ensureUserHasKeyPair(currentUserId);
    
    ws.send(JSON.stringify({
      type: 'share_public_key',
      publicKey: keyPair.publicKey
    }));
  } catch (error) {
    console.error('Error sharing public key:', error);
    throw error;
  }
};

/**
 * Add event listener for specific message types
 */
export const addListener = (type: string, callback: (data: any) => void): void => {
  if (!messageListeners[type]) {
    messageListeners[type] = [];
  }
  
  messageListeners[type].push(callback);
};

/**
 * Remove event listener
 */
export const removeListener = (type: string, callback: (data: any) => void): void => {
  if (!messageListeners[type]) return;
  
  messageListeners[type] = messageListeners[type].filter(cb => cb !== callback);
};

/**
 * Add connection state change listener
 */
export const addStateChangeListener = (callback: (isConnected: boolean) => void): void => {
  stateChangeListeners.push(callback);
};

/**
 * Remove state change listener
 */
export const removeStateChangeListener = (callback: (isConnected: boolean) => void): void => {
  const index = stateChangeListeners.indexOf(callback);
  if (index !== -1) {
    stateChangeListeners.splice(index, 1);
  }
};

/**
 * Notify all listeners of a specific message type
 */
const notifyListeners = (type: string, data: any): void => {
  if (!messageListeners[type]) return;
  
  messageListeners[type].forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in ${type} listener:`, error);
    }
  });
};

/**
 * Notify state change listeners
 */
const notifyStateChange = (isConnected: boolean): void => {
  stateChangeListeners.forEach(callback => {
    try {
      callback(isConnected);
    } catch (error) {
      console.error('Error in state change listener:', error);
    }
  });
};

/**
 * Schedule reconnection attempt
 */
const scheduleReconnect = (): void => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), MAX_RECONNECT_DELAY);
  
  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    console.log(`Attempting to reconnect (attempt ${reconnectAttempts})...`);
    
    // Use the stored auth token if available
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      initializeWebSocket(authToken).catch(error => {
        console.error('Reconnection attempt failed:', error);
      });
    }
  }, delay);
};

/**
 * Disconnect WebSocket
 */
export const disconnect = (): void => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (ws) {
    try {
      ws.close();
    } catch (e) {}
    ws = null;
  }
  
  isConnected = false;
  isAuthenticated = false;
  notifyStateChange(false);
};

/**
 * Check if WebSocket is connected and authenticated
 */
export const isWebSocketReady = (): boolean => {
  return isConnected && isAuthenticated;
};

/**
 * Get user's ID
 */
export const getUserId = (): string | null => {
  return currentUserId;
};

/**
 * Get shared key for communicating with another user
 */
export const getSharedKeyForUser = async (recipientId: string): Promise<Uint8Array | null> => {
  if (!isWebSocketReady() || !currentUserId) {
    console.warn('WebSocket not ready or user not authenticated');
    return null;
  }

  if (sharedKeyCache[recipientId]) {
    return sharedKeyCache[recipientId];
  }

  try {
    const myKeyPair = await ensureUserHasKeyPair(currentUserId);
    
    // Request recipient's public key
    ws?.send(JSON.stringify({
      type: 'request_public_key',
      recipientId
    }));
    
    // Wait for response
    return new Promise((resolve) => {
      const listener = (data: any) => {
        if (data.userId === recipientId) {
          // Remove this listener
          removeListener('public_key', listener);
          
          if (data.publicKey) {
            try {
              // Generate shared key from my private key and their public key
              const sharedKey = getSharedKey(
                myKeyPair.privateKey, 
                data.publicKey
              );
              
              // Cache the shared key
              sharedKeyCache[recipientId] = sharedKey;
              
              resolve(sharedKey);
            } catch (error) {
              console.error('Error generating shared key:', error);
              resolve(null);
            }
          } else {
            console.warn(`No public key available for user ${recipientId}`);
            resolve(null);
          }
        }
      };
      
      addListener('public_key', listener);
      
      // Set a timeout in case we don't get a response
      setTimeout(() => {
        removeListener('public_key', listener);
        console.warn(`Timeout waiting for public key from ${recipientId}`);
        resolve(null);
      }, 5000);
    });
  } catch (error) {
    console.error('Error getting shared key:', error);
    return null;
  }
};