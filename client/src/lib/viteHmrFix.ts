/**
 * Fix for Vite WebSocket HMR disconnection issues
 * 
 * This completely disables the Vite WebSocket HMR since we're having issues with it
 * and it's not critical for functionality.
 */

// Disable Vite's WebSocket HMR
if (typeof window !== 'undefined') {
  // Disable Vite HMR by intercepting WebSocket connections to localhost:undefined
  const originalWebSocket = window.WebSocket;
  
  // Override the WebSocket constructor to prevent connecting to undefined URLs
  // @ts-ignore
  window.WebSocket = function(url, protocols) {
    // Catch Vite's HMR WebSocket connections with various invalid URLs
    if (url && typeof url === 'string' && 
        (url.includes('localhost:undefined') || 
         url.includes('undefined/?token=') || 
         url.includes('wss://localhost:undefined'))) {
      console.log('Blocked Vite HMR WebSocket connection to:', url);
      
      // Return a fake WebSocket object that doesn't really connect
      const mockWs = {
        readyState: 3, // CLOSED
        send: function() {},
        close: function() {},
        addEventListener: function() {},
        removeEventListener: function() {},
        dispatchEvent: function() { return true; }
      };
      
      // Simulate connection error after a short delay
      setTimeout(() => {
        if (this.onerror) this.onerror(new Event('error'));
        if (this.onclose) this.onclose(new CloseEvent('close'));
      }, 50);
      
      // @ts-ignore
      return mockWs;
    }
    
    // For all other URLs, use the original WebSocket implementation
    return new originalWebSocket(url, protocols);
  };
  
  // Copy all static properties and methods
  for (const prop in originalWebSocket) {
    if (Object.prototype.hasOwnProperty.call(originalWebSocket, prop)) {
      // @ts-ignore
      window.WebSocket[prop] = originalWebSocket[prop];
    }
  }
  
  // Ensure prototype chain is preserved
  // @ts-ignore
  window.WebSocket.prototype = originalWebSocket.prototype;
  
  console.log('Vite HMR WebSocket disabled to prevent errors');
}

// Function to apply this fix - not actually needed since we auto-execute
export function applyViteHmrFix() {
  console.log('Vite HMR fix already applied');
}