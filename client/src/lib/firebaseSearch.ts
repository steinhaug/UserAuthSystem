import { 
  ref, 
  set, 
  push, 
  onValue, 
  get, 
  update, 
  query,
  orderByChild,
  limitToLast,
  endAt,
  startAt,
  equalTo,
  serverTimestamp,
  onDisconnect,
  connectDatabaseEmulator
} from 'firebase/database';
import { rtdb } from './firebaseConfig';
import { InsertSearchHistory, SearchHistory } from '@shared/schema';
import { DEVELOPMENT_MODE } from './constants';

// Track real-time connection status
let realtimeConnected = false;

// Initialize connection monitoring
const connectedRef = ref(rtdb, '.info/connected');

// Only set up the connection monitoring in production mode
if (!DEVELOPMENT_MODE) {
  onValue(connectedRef, (snap) => {
    realtimeConnected = snap.val() === true;
    console.log('Firebase Realtime Database connection state:', realtimeConnected ? 'connected' : 'disconnected');
  });
}

// Function to check if the realtime database is connected
export const isRealtimeConnected = async (): Promise<boolean> => {
  if (DEVELOPMENT_MODE) {
    return false; // Always return false in development mode
  }
  
  // For production, return the current connection status
  return realtimeConnected;
};

// References to database locations
const searchHistoryRef = ref(rtdb, 'search_history');
const trendingSearchesRef = ref(rtdb, 'trending_searches');
const userSearchHistoryRef = (userId: string) => ref(rtdb, `users/${userId}/search_history`);
const userSearchPreferencesRef = (userId: string) => ref(rtdb, `users/${userId}/search_preferences`);
const personalizedSuggestionsRef = (userId: string) => ref(rtdb, `users/${userId}/personalized_suggestions`);

// Save search to Firebase Realtime Database
export const saveSearchToFirebase = async (
  searchData: Omit<InsertSearchHistory, 'userId'>, 
  userId: string
) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - not saving search to Firebase RTDB");
    return null;
  }

  try {
    // Create a reference for the new search entry
    const newSearchRef = push(userSearchHistoryRef(userId));
    
    // Create search data object with timestamp
    const searchEntry = {
      ...searchData,
      userId,
      timestamp: Date.now()
    };
    
    // Save to user's search history
    await set(newSearchRef, searchEntry);
    
    // If the search was successful, increment the global count for this query
    if (searchData.successful) {
      const trendingSearchRef = ref(rtdb, `trending_searches/${encodeURIComponent(searchData.query)}`);
      const snapshot = await get(trendingSearchRef);
      
      if (snapshot.exists()) {
        // Update existing count
        await update(trendingSearchRef, {
          count: snapshot.val().count + 1,
          lastUpdated: Date.now()
        });
      } else {
        // Create new count
        await set(trendingSearchRef, {
          query: searchData.query,
          count: 1,
          firstSeen: Date.now(),
          lastUpdated: Date.now()
        });
      }
    }
    
    return newSearchRef.key;
  } catch (error) {
    console.error("Error saving search to Firebase:", error);
    return null;
  }
};

// Toggle favorite status for a search
export const toggleSearchFavorite = async (userId: string, searchId: string, favorite: boolean) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - not updating favorite status in Firebase RTDB");
    return;
  }

  try {
    const searchRef = ref(rtdb, `users/${userId}/search_history/${searchId}`);
    await update(searchRef, { favorite });
  } catch (error) {
    console.error("Error updating search favorite status:", error);
    throw error;
  }
};

// Get trending searches
export const getTrendingSearches = async (limit: number = 10) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - returning mock trending searches");
    return [
      "Plogging", 
      "Kajakktur",
      "Fotballkamp",
      "Løpetrening",
      "Yogaklasse",
      "Sykkeltur"
    ].slice(0, limit);
  }

  try {
    const trendingQuery = query(
      trendingSearchesRef,
      orderByChild('count'),
      limitToLast(limit)
    );
    
    const snapshot = await get(trendingQuery);
    const trendingSearches: string[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        trendingSearches.push(childSnapshot.val().query);
      });
    }
    
    // Return in reverse order (highest count first)
    return trendingSearches.reverse();
  } catch (error) {
    console.error("Error getting trending searches:", error);
    return [];
  }
};

// Get user's search history
export const getUserSearchHistory = async (userId: string, limit: number = 20) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - not fetching search history from Firebase RTDB");
    return [];
  }

  try {
    const historyQuery = query(
      userSearchHistoryRef(userId),
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    
    const snapshot = await get(historyQuery);
    const searchHistory: any[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        searchHistory.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    }
    
    // Return in reverse chronological order (newest first)
    return searchHistory.reverse();
  } catch (error) {
    console.error("Error getting search history:", error);
    return [];
  }
};

// Get search suggestions based on partial input
export const getSearchSuggestions = async (userId: string, prefix: string, limit: number = 10) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - not fetching search suggestions from Firebase RTDB");
    return [];
  }

  try {
    // Get user's own history matches first
    const userHistoryQuery = query(
      userSearchHistoryRef(userId),
      orderByChild('query'),
      startAt(prefix),
      endAt(prefix + '\uf8ff'), // Unicode 'end of string' character for prefix search
      limitToLast(limit)
    );
    
    const userSnapshot = await get(userHistoryQuery);
    const suggestions = new Set<string>();
    
    if (userSnapshot.exists()) {
      userSnapshot.forEach((childSnapshot) => {
        suggestions.add(childSnapshot.val().query);
      });
    }
    
    // If we don't have enough suggestions, get from trending searches
    if (suggestions.size < limit) {
      const trendingQuery = query(
        trendingSearchesRef,
        orderByChild('query'),
        startAt(prefix),
        endAt(prefix + '\uf8ff'),
        limitToLast(limit - suggestions.size)
      );
      
      const trendingSnapshot = await get(trendingQuery);
      
      if (trendingSnapshot.exists()) {
        trendingSnapshot.forEach((childSnapshot) => {
          suggestions.add(childSnapshot.val().query);
        });
      }
    }
    
    return Array.from(suggestions);
  } catch (error) {
    console.error("Error getting search suggestions:", error);
    return [];
  }
};

// Get personalized suggestions for user
export const getPersonalizedSuggestions = async (userId: string, limit: number = 10) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - not fetching personalized suggestions from Firebase RTDB");
    return {
      suggestions: [],
      trending: [],
      categories: {
        favorites: [],
        timeBased: [],
        trending: [],
        preferences: []
      }
    };
  }

  try {
    // This would normally involve some server-side processing
    // For now, we'll just combine data from different sources
    
    // 1. Get user's favorite searches
    const favoritesQuery = query(
      userSearchHistoryRef(userId),
      orderByChild('favorite'),
      equalTo(true),
      limitToLast(5)
    );
    
    const favoritesSnapshot = await get(favoritesQuery);
    const favorites: string[] = [];
    
    if (favoritesSnapshot.exists()) {
      favoritesSnapshot.forEach((childSnapshot) => {
        favorites.push(childSnapshot.val().query);
      });
    }
    
    // 2. Get trending searches
    const trending = await getTrendingSearches(5);
    
    // 3. Generate time-based suggestions
    const hour = new Date().getHours();
    let timeBased: string[] = [];
    
    // Morning suggestions
    if (hour >= 6 && hour < 11) {
      timeBased = ['Morgentrening', 'Frokost-treff', 'Joggetur'];
    }
    // Lunch suggestions
    else if (hour >= 11 && hour < 14) {
      timeBased = ['Lunsj-treff', 'Shopping-tur', 'Kaffepauser'];
    }
    // Afternoon suggestions
    else if (hour >= 14 && hour < 18) {
      timeBased = ['Ettermiddagstur', 'Studiegruppe', 'Fotball'];
    }
    // Evening suggestions
    else {
      timeBased = ['Middag ute', 'Kveldstrening', 'Filmkveld'];
    }
    
    // 4. Get preference-based suggestions
    // (In a real implementation, we'd pull these from user preferences)
    const preferences = [
      'Friluftsliv', 
      'Fjelltur', 
      'Sykling', 
      'Fotball', 
      'Volleyball'
    ];
    
    // Combine all suggestions, prioritizing favorites and preferences
    const allSuggestions = [
      ...favorites,
      ...preferences,
      ...timeBased,
      ...trending
    ];
    
    // Remove duplicates
    const uniqueSuggestions = Array.from(new Set(allSuggestions));
    
    return {
      suggestions: uniqueSuggestions.slice(0, limit),
      trending: trending.slice(0, 3),
      categories: {
        favorites: favorites.slice(0, 3),
        timeBased: timeBased.slice(0, 3),
        trending: trending.slice(0, 3),
        preferences: preferences.slice(0, 3)
      }
    };
  } catch (error) {
    console.error("Error getting personalized suggestions:", error);
    return {
      suggestions: [],
      trending: [],
      categories: {
        favorites: [],
        timeBased: [],
        trending: [],
        preferences: []
      }
    };
  }
};

// Set up real-time listener for personalized suggestions
export const listenToPersonalizedSuggestions = (
  userId: string, 
  callback: (data: any) => void
) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - not setting up real-time listener");
    return () => {}; // Return empty unsubscribe function
  }

  // Create a real-time listener on the user's personalized suggestions
  const suggestionsRef = personalizedSuggestionsRef(userId);
  
  // Set up the listener
  const unsubscribe = onValue(suggestionsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      // If no personalized data exists yet, generate it on-demand
      getPersonalizedSuggestions(userId)
        .then(suggestions => {
          // Store the generated suggestions
          update(suggestionsRef, suggestions);
          // Call the callback with the generated data
          callback(suggestions);
        });
    }
  });
  
  // Return unsubscribe function
  return unsubscribe;
};

// Save search history items to local storage for offline use
export const saveSearchHistoryLocally = (searchHistory: SearchHistory[]) => {
  try {
    localStorage.setItem('offlineSearchHistory', JSON.stringify(searchHistory));
    localStorage.setItem('offlineSearchHistoryTimestamp', Date.now().toString());
    return true;
  } catch (error) {
    console.error("Error saving search history to local storage:", error);
    return false;
  }
};

// Get search history from local storage
export const getLocalSearchHistory = (): { items: SearchHistory[], timestamp: number } => {
  try {
    const items = JSON.parse(localStorage.getItem('offlineSearchHistory') || '[]');
    const timestamp = parseInt(localStorage.getItem('offlineSearchHistoryTimestamp') || '0', 10);
    return { items, timestamp };
  } catch (error) {
    console.error("Error getting search history from local storage:", error);
    return { items: [], timestamp: 0 };
  }
};

// Mark a search as pending sync to Firebase
export const markSearchForSync = (searchId: number) => {
  try {
    const pendingSync = JSON.parse(localStorage.getItem('pendingSearchSync') || '[]');
    if (!pendingSync.includes(searchId)) {
      pendingSync.push(searchId);
      localStorage.setItem('pendingSearchSync', JSON.stringify(pendingSync));
    }
    return true;
  } catch (error) {
    console.error("Error marking search for sync:", error);
    return false;
  }
};

// Get searches pending sync
export const getPendingSyncSearches = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem('pendingSearchSync') || '[]');
  } catch (error) {
    console.error("Error getting pending sync searches:", error);
    return [];
  }
};

// Clear a search from pending sync
export const clearSearchFromPendingSync = (searchId: number) => {
  try {
    const pendingSync = JSON.parse(localStorage.getItem('pendingSearchSync') || '[]');
    const index = pendingSync.indexOf(searchId);
    if (index > -1) {
      pendingSync.splice(index, 1);
      localStorage.setItem('pendingSearchSync', JSON.stringify(pendingSync));
    }
    return true;
  } catch (error) {
    console.error("Error clearing search from pending sync:", error);
    return false;
  }
};

// Synchronize search history from server to Firebase with conflict resolution
export const syncSearchHistoryToFirebase = async (userId: string, searchHistory: SearchHistory[]) => {
  if (DEVELOPMENT_MODE) {
    console.log("Firebase Search: Development mode - not syncing search history to Firebase");
    return false;
  }
  
  try {
    const historyRef = userSearchHistoryRef(userId);
    
    // First, get existing data from Firebase to check for conflicts
    const snapshot = await get(historyRef);
    const existingData: Record<string, any> = snapshot.exists() ? snapshot.val() : {};
    
    // Create a data structure for the history
    const historyData: Record<string, any> = {};
    
    // Add each history item with a Firebase-friendly ID, resolving conflicts
    for (const item of searchHistory) {
      const itemId = `search-${item.id}`;
      const existingItem = existingData[itemId];
      
      // Prepare the new item data
      const newItemData: Record<string, any> = {
        id: item.id,
        userId: item.userId,
        query: item.query,
        type: item.type,
        timestamp: item.timestamp?.getTime() || Date.now(),
        favorite: item.favorite || false,
        successful: item.successful || true,
        lastUpdated: Date.now() // Add this field to track updates
      };
      
      // If item already exists in Firebase, we need to resolve conflicts
      if (existingItem) {
        // Create a merged item with conflict resolution:
        // - For favorite status, use the most recent change
        // - For other fields, prefer the server version unless Firebase has newer changes
        
        const serverTimestamp = newItemData.timestamp;
        const firebaseTimestamp = existingItem.timestamp || 0;
        const firebaseUpdated = existingItem.lastUpdated || 0;
        
        // If Firebase has a newer version (someone updated it from another device)
        if (firebaseUpdated > serverTimestamp) {
          // Use Firebase version of favorite status and notes
          newItemData.favorite = existingItem.favorite;
          if (existingItem.notes) {
            newItemData.notes = existingItem.notes;
          }
        }
        
        // Add a last updated timestamp to track changes
        newItemData.lastUpdated = Date.now();
      }
      
      // Add to the batch update
      historyData[itemId] = newItemData;
      
      // Clear from pending sync if it was there
      clearSearchFromPendingSync(item.id);
    }
    
    // Update all at once
    await update(historyRef, historyData);
    console.log(`Synchronized ${searchHistory.length} search history items to Firebase with conflict resolution`);
    
    // Also save to local storage for offline use
    saveSearchHistoryLocally(searchHistory);
    
    return true;
  } catch (error) {
    console.error("Error syncing search history to Firebase:", error);
    
    // If offline, mark these searches for future sync
    if (!realtimeConnected) {
      searchHistory.forEach(item => markSearchForSync(item.id));
      saveSearchHistoryLocally(searchHistory);
    }
    
    return false;
  }
};

// Mark that search data has been migrated to Firebase for this user
export const markSearchDataMigrated = async (userId: string) => {
  if (DEVELOPMENT_MODE) return;
  
  try {
    const migrationRef = ref(rtdb, `users/${userId}/migration`);
    await update(migrationRef, {
      searchHistoryMigrated: true,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error marking search data as migrated:", error);
    return false;
  }
};

// Check if search data has been migrated to Firebase for this user
export const isSearchDataMigrated = async (userId: string): Promise<boolean> => {
  if (DEVELOPMENT_MODE) return false;
  
  try {
    const migrationRef = ref(rtdb, `users/${userId}/migration`);
    const snapshot = await get(migrationRef);
    
    if (snapshot.exists()) {
      return snapshot.val().searchHistoryMigrated === true;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking search data migration status:", error);
    return false;
  }
};