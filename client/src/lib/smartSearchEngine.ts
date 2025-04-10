import { SearchHistory } from '@shared/schema';

interface SearchPattern {
  pattern: string;
  frequency: number;
  lastUsed: Date;
  timeOfDay: string; // morning, afternoon, evening, night
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  categories: Record<string, number>;
  locations: Record<string, number>;
}

interface SmartSuggestion {
  query: string;
  score: number;
  reason: string;
  category?: string;
  source: 'history' | 'pattern' | 'trending' | 'time' | 'location' | 'preferences';
}

// Utility to get time of day
const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

// Get day of week (0-6, Sunday is 0)
const getDayOfWeek = (): number => {
  return new Date().getDay();
};

// Extract unique terms from search queries
const extractTerms = (query: string): string[] => {
  return query
    .toLowerCase()
    .replace(/[^\w\såøæÅØÆ]/g, '')
    .split(/\s+/)
    .filter(term => term.length > 2);
};

// Extract potential locations from a query
const extractLocations = (query: string): string[] => {
  // Simple location detection - in a real app, this would use a more sophisticated approach
  const commonLocationIndicators = ['i', 'ved', 'nær', 'på'];
  
  const words = query.toLowerCase().split(/\s+/);
  const potentialLocations: string[] = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    if (commonLocationIndicators.includes(words[i])) {
      // The word after a location indicator might be a location
      potentialLocations.push(words[i + 1]);
    }
  }
  
  return potentialLocations;
};

// Extract potential categories from a query
const extractCategories = (query: string): string[] => {
  const categoryKeywords: Record<string, string[]> = {
    'sports': ['løp', 'trening', 'jogge', 'ski', 'fotball', 'sport', 'sykkel', 'basketball', 'plogging'],
    'social': ['møte', 'kaffe', 'lunsj', 'middag', 'fest', 'arrangement', 'sosialt'],
    'culture': ['museum', 'teater', 'kino', 'konsert', 'utstilling', 'galleri', 'kunst'],
    'outdoor': ['tur', 'fjell', 'skog', 'strand', 'park', 'friluft', 'vandring', 'hike'],
    'food': ['restaurant', 'café', 'spisested', 'mat', 'brunch', 'bakeri', 'iskrem']
  };
  
  const words = query.toLowerCase().split(/\s+/);
  const categories: string[] = [];
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      categories.push(category);
    }
  }
  
  return categories;
};

// Identify search patterns from history
export const identifySearchPatterns = (history: SearchHistory[]): SearchPattern[] => {
  if (!history || history.length < 3) return [];
  
  const patterns: SearchPattern[] = [];
  const termFrequency: Record<string, number> = {};
  const timeOfDayFrequency: Record<string, number> = {};
  const dayOfWeekFrequency: Record<number, number> = {};
  const categoryFrequency: Record<string, number> = {};
  const locationFrequency: Record<string, number> = {};
  
  // Analyze search history
  history.forEach(item => {
    // Extract terms
    const terms = extractTerms(item.query);
    terms.forEach(term => {
      termFrequency[term] = (termFrequency[term] || 0) + 1;
    });
    
    // Track time patterns
    const timestamp = new Date(item.timestamp);
    const hour = timestamp.getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else if (hour >= 22 || hour < 5) timeOfDay = 'night';
    
    timeOfDayFrequency[timeOfDay] = (timeOfDayFrequency[timeOfDay] || 0) + 1;
    
    // Track day of week
    const dayOfWeek = timestamp.getDay();
    dayOfWeekFrequency[dayOfWeek] = (dayOfWeekFrequency[dayOfWeek] || 0) + 1;
    
    // Track categories
    if (item.category) {
      categoryFrequency[item.category] = (categoryFrequency[item.category] || 0) + 1;
    } else {
      // Try to identify categories from query
      const categories = extractCategories(item.query);
      categories.forEach(category => {
        categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;
      });
    }
    
    // Track locations
    if (item.latitude && item.longitude) {
      const locationKey = `${item.latitude},${item.longitude}`;
      locationFrequency[locationKey] = (locationFrequency[locationKey] || 0) + 1;
    } else {
      // Try to identify locations from query
      const locations = extractLocations(item.query);
      locations.forEach(location => {
        locationFrequency[location] = (locationFrequency[location] || 0) + 1;
      });
    }
  });
  
  // Create patterns for frequent terms
  Object.entries(termFrequency)
    .filter(([_, frequency]) => frequency > 1)
    .forEach(([term, frequency]) => {
      const relatedSearches = history.filter(item => 
        extractTerms(item.query).includes(term)
      );
      
      if (relatedSearches.length > 0) {
        const lastUsed = new Date(relatedSearches[0].timestamp);
        
        // Gather category info for this term
        const termCategories: Record<string, number> = {};
        relatedSearches.forEach(item => {
          if (item.category) {
            termCategories[item.category] = (termCategories[item.category] || 0) + 1;
          } else {
            const categories = extractCategories(item.query);
            categories.forEach(category => {
              termCategories[category] = (termCategories[category] || 0) + 1;
            });
          }
        });
        
        // Gather location info for this term
        const termLocations: Record<string, number> = {};
        relatedSearches.forEach(item => {
          if (item.latitude && item.longitude) {
            const locationKey = `${item.latitude},${item.longitude}`;
            termLocations[locationKey] = (termLocations[locationKey] || 0) + 1;
          } else {
            const locations = extractLocations(item.query);
            locations.forEach(location => {
              termLocations[location] = (termLocations[location] || 0) + 1;
            });
          }
        });
        
        // Calculate most common time of day for this term
        const termTimeFrequency: Record<string, number> = {
          morning: 0, afternoon: 0, evening: 0, night: 0
        };
        
        relatedSearches.forEach(item => {
          const timestamp = new Date(item.timestamp);
          const hour = timestamp.getHours();
          let timeOfDay = 'morning';
          if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
          else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
          else if (hour >= 22 || hour < 5) timeOfDay = 'night';
          
          termTimeFrequency[timeOfDay]++;
        });
        
        // Find most common time of day
        const timeOfDay = Object.entries(termTimeFrequency)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Calculate most common day of week for this term
        const termDayFrequency: Record<number, number> = {
          0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
        };
        
        relatedSearches.forEach(item => {
          const timestamp = new Date(item.timestamp);
          const day = timestamp.getDay();
          termDayFrequency[day]++;
        });
        
        // Find most common day of week
        const dayOfWeek = parseInt(Object.entries(termDayFrequency)
          .sort((a, b) => b[1] - a[1])[0][0]);
        
        patterns.push({
          pattern: term,
          frequency,
          lastUsed,
          timeOfDay,
          dayOfWeek,
          categories: termCategories,
          locations: termLocations
        });
      }
    });
  
  return patterns;
};

// Generate smart search suggestions
export const generateSmartSuggestions = (
  history: SearchHistory[],
  userPreferences?: any,
  limit: number = 10
): SmartSuggestion[] => {
  if (!history || history.length === 0) return [];
  
  const suggestions: SmartSuggestion[] = [];
  const patterns = identifySearchPatterns(history);
  const currentTimeOfDay = getTimeOfDay();
  const currentDayOfWeek = getDayOfWeek();
  
  // Add frequently used searches first
  const frequentSearches = history
    .filter(item => item.favorite)
    .map(item => ({
      query: item.query,
      score: 100,
      reason: 'Favoritt-søk',
      source: 'history' as const
    }));
  
  suggestions.push(...frequentSearches);
  
  // Add time-of-day based suggestions
  const timeBasedPatterns = patterns
    .filter(pattern => pattern.timeOfDay === currentTimeOfDay)
    .sort((a, b) => b.frequency - a.frequency);
  
  timeBasedPatterns.slice(0, 3).forEach(pattern => {
    // Find a relevant search using this pattern
    const relevantSearches = history.filter(item => 
      extractTerms(item.query).includes(pattern.pattern)
    );
    
    if (relevantSearches.length > 0) {
      const bestMatch = relevantSearches[0];
      suggestions.push({
        query: bestMatch.query,
        score: 90 - suggestions.length,
        reason: `Populært ${
          currentTimeOfDay === 'morning' ? 'om morgenen' :
          currentTimeOfDay === 'afternoon' ? 'på ettermiddagen' :
          currentTimeOfDay === 'evening' ? 'på kvelden' : 'om natten'
        }`,
        source: 'time'
      });
    }
  });
  
  // Add day-of-week based suggestions
  const dayBasedPatterns = patterns
    .filter(pattern => pattern.dayOfWeek === currentDayOfWeek)
    .sort((a, b) => b.frequency - a.frequency);
  
  dayBasedPatterns.slice(0, 2).forEach(pattern => {
    // Find a relevant search using this pattern
    const relevantSearches = history.filter(item => 
      extractTerms(item.query).includes(pattern.pattern)
    );
    
    if (relevantSearches.length > 0) {
      const bestMatch = relevantSearches[0];
      
      // Only add if not already in suggestions
      if (!suggestions.some(s => s.query === bestMatch.query)) {
        suggestions.push({
          query: bestMatch.query,
          score: 85 - suggestions.length,
          reason: `Populært på ${
            currentDayOfWeek === 0 ? 'søndager' :
            currentDayOfWeek === 1 ? 'mandager' :
            currentDayOfWeek === 2 ? 'tirsdager' :
            currentDayOfWeek === 3 ? 'onsdager' :
            currentDayOfWeek === 4 ? 'torsdager' :
            currentDayOfWeek === 5 ? 'fredager' : 'lørdager'
          }`,
          source: 'pattern'
        });
      }
    }
  });
  
  // Add category-based suggestions
  if (userPreferences?.favoriteCategories?.length > 0) {
    const preferredCategories = userPreferences.favoriteCategories;
    
    preferredCategories.forEach(category => {
      const categoryPatterns = patterns
        .filter(pattern => pattern.categories[category])
        .sort((a, b) => 
          (b.categories[category] || 0) - (a.categories[category] || 0)
        );
      
      if (categoryPatterns.length > 0) {
        const bestPattern = categoryPatterns[0];
        const relevantSearches = history.filter(item => 
          extractTerms(item.query).includes(bestPattern.pattern)
        );
        
        if (relevantSearches.length > 0) {
          const bestMatch = relevantSearches[0];
          
          // Only add if not already in suggestions
          if (!suggestions.some(s => s.query === bestMatch.query)) {
            suggestions.push({
              query: bestMatch.query,
              score: 80 - suggestions.length,
              reason: `Basert på dine interesser`,
              category: category as string,
              source: 'preferences'
            });
          }
        }
      }
    });
  }
  
  // Add recent searches (that aren't already in suggestions)
  const recentSearches = history
    .slice(0, 5)
    .filter(item => !suggestions.some(s => s.query === item.query))
    .map(item => ({
      query: item.query,
      score: 70 - suggestions.length,
      reason: 'Nylig søkt',
      source: 'history' as const
    }));
  
  suggestions.push(...recentSearches);
  
  // Add contextual suggestions based on location patterns
  if (userPreferences?.lastLocation) {
    const { latitude, longitude } = userPreferences.lastLocation;
    const locationKey = `${latitude},${longitude}`;
    
    const locationPatterns = patterns
      .filter(pattern => pattern.locations[locationKey])
      .sort((a, b) => 
        (b.locations[locationKey] || 0) - (a.locations[locationKey] || 0)
      );
    
    if (locationPatterns.length > 0) {
      const bestPattern = locationPatterns[0];
      const relevantSearches = history.filter(item => 
        extractTerms(item.query).includes(bestPattern.pattern)
      );
      
      if (relevantSearches.length > 0) {
        const bestMatch = relevantSearches[0];
        
        // Only add if not already in suggestions
        if (!suggestions.some(s => s.query === bestMatch.query)) {
          suggestions.push({
            query: bestMatch.query,
            score: 65 - suggestions.length,
            reason: 'Basert på din posisjon',
            source: 'location'
          });
        }
      }
    }
  }
  
  // Sort by score and limit
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// Generate contextual search suggestions (e.g., based on current page/view)
export const generateContextualSuggestions = (
  context: string,
  history: SearchHistory[],
  limit: number = 5
): SmartSuggestion[] => {
  if (!history || history.length === 0) return [];
  
  // Extract context keywords
  const contextTerms = extractTerms(context);
  if (contextTerms.length === 0) return [];
  
  const suggestions: SmartSuggestion[] = [];
  
  // Find history items that match the context
  history.forEach(item => {
    const itemTerms = extractTerms(item.query);
    const matchCount = contextTerms.filter(term => itemTerms.includes(term)).length;
    
    if (matchCount > 0) {
      suggestions.push({
        query: item.query,
        score: matchCount * 20,
        reason: 'Relevant for nåværende side',
        source: 'pattern'
      });
    }
  });
  
  // Sort by score and limit
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// Generate trending patterns (topics with growing search frequency)
export const identifyTrendingPatterns = (
  history: SearchHistory[],
  timeWindowDays: number = 7
): SmartSuggestion[] => {
  if (!history || history.length < 5) return [];
  
  const now = new Date();
  const timeWindow = new Date(now.getTime() - (timeWindowDays * 24 * 60 * 60 * 1000));
  
  // Divide history into recent and older
  const recentHistory = history.filter(item => new Date(item.timestamp) >= timeWindow);
  const olderHistory = history.filter(item => new Date(item.timestamp) < timeWindow);
  
  if (recentHistory.length < 3 || olderHistory.length < 3) return [];
  
  // Calculate term frequency in recent history
  const recentTermFrequency: Record<string, number> = {};
  recentHistory.forEach(item => {
    const terms = extractTerms(item.query);
    terms.forEach(term => {
      recentTermFrequency[term] = (recentTermFrequency[term] || 0) + 1;
    });
  });
  
  // Calculate term frequency in older history
  const olderTermFrequency: Record<string, number> = {};
  olderHistory.forEach(item => {
    const terms = extractTerms(item.query);
    terms.forEach(term => {
      olderTermFrequency[term] = (olderTermFrequency[term] || 0) + 1;
    });
  });
  
  // Calculate growth rate for each term
  const termGrowth: Record<string, number> = {};
  
  Object.entries(recentTermFrequency).forEach(([term, recentFreq]) => {
    const olderFreq = olderTermFrequency[term] || 0;
    
    // Normalize frequencies by number of searches in each period
    const normalizedRecentFreq = recentFreq / recentHistory.length;
    const normalizedOlderFreq = olderFreq / olderHistory.length;
    
    // Calculate growth rate (handling division by zero)
    let growthRate = 0;
    if (normalizedOlderFreq === 0) {
      // Term is new, give it a high growth rate
      growthRate = normalizedRecentFreq * 10;
    } else {
      growthRate = (normalizedRecentFreq - normalizedOlderFreq) / normalizedOlderFreq;
    }
    
    // Only consider terms with positive growth
    if (growthRate > 0) {
      termGrowth[term] = growthRate;
    }
  });
  
  // Sort terms by growth rate
  const trendingTerms = Object.entries(termGrowth)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, growthRate]) => term);
  
  // Find representative searches for each trending term
  const suggestions: SmartSuggestion[] = [];
  
  trendingTerms.forEach(term => {
    const relevantSearches = recentHistory.filter(item => 
      extractTerms(item.query).includes(term)
    );
    
    if (relevantSearches.length > 0) {
      // Use the most recent search containing this term
      const bestMatch = relevantSearches[0];
      
      suggestions.push({
        query: bestMatch.query,
        score: 95 - suggestions.length * 5,
        reason: 'Økende trend',
        source: 'trending'
      });
    }
  });
  
  return suggestions;
};