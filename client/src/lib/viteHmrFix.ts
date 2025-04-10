/**
 * Fix for Vite WebSocket HMR disconnection issues
 * 
 * This workaround patches the Vite WebSocket connection setup to prevent
 * errors with 'undefined' port in the WebSocket URL.
 */

// Wait until window and document are defined
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Run after the document is fully loaded
  window.addEventListener('DOMContentLoaded', () => {
    const viteFix = () => {
      try {
        // Find any existing error websocket connections and close them
        const existingWsElements = document.querySelectorAll(
          'script[data-vite-dev-id="/vite/client"][data-ws-error="true"]'
        );
        
        // Remove any error scripts
        existingWsElements.forEach(el => el.parentNode?.removeChild(el));
        
        // Fix WebSocket connection by overriding WebSocket
        const originalWebSocket = window.WebSocket;
        
        // @ts-ignore
        window.WebSocket = function(url: string, protocols?: string | string[]) {
          if (url.includes('undefined')) {
            // Fix the URL by replacing 'undefined' with proper values
            const fixedUrl = url.replace('wss://localhost:undefined', 
              `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//` + 
              `${window.location.host}`
            );
            
            console.log('Fixed WebSocket URL:', fixedUrl);
            return new originalWebSocket(fixedUrl, protocols);
          }
          
          return new originalWebSocket(url, protocols);
        };
        
        // Copy all properties from the original WebSocket constructor
        Object.keys(originalWebSocket).forEach(key => {
          // @ts-ignore
          window.WebSocket[key] = originalWebSocket[key];
        });
        
        // Copy the prototype
        // @ts-ignore
        window.WebSocket.prototype = originalWebSocket.prototype;
        
        console.log('Vite HMR WebSocket patched');
      } catch (err) {
        console.error('Error in Vite HMR fix:', err);
      }
    };
    
    // Start the fix process
    viteFix();
  });
}

// Export a dummy function so this module can be imported
export function applyViteHmrFix() {
  console.log('Vite HMR fix loaded');
}