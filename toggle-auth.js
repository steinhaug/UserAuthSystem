// Simple script to toggle the authentication mode in localStorage
// Run this with: node toggle-auth.js

// Get current setting
const currentSetting = localStorage.getItem('useRealAuth');
console.log("Current setting:", currentSetting);

// Toggle it
const newSetting = currentSetting !== 'true';
localStorage.setItem('useRealAuth', newSetting ? 'true' : 'false');

console.log(`Authentication mode changed to: ${newSetting ? 'Real Firebase Auth' : 'Mock Authentication'}`);
console.log("Please reload the application for changes to take effect.");