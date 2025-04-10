import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Initialize Anthropic with API key from environment
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const router = express.Router();

// Set up multer for handling audio file uploads
const upload = multer({ 
  dest: 'temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Check if Anthropic API key is available
router.get('/check', (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'Anthropic API key not configured. Please add it to your environment variables.' 
    });
  }
  
  return res.json({ 
    status: 'success', 
    message: 'Anthropic API key is configured.'
  });
});

// Note: Anthropic doesn't have native audio transcription like OpenAI's Whisper
// This is a placeholder for future functionality
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const filePath = req.file.path;
    
    // Check if Anthropic API key is properly configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Anthropic API key not properly configured.');
      
      // Clean up the file
      fs.unlinkSync(filePath);
      
      // Return a friendly message
      return res.json({ 
        text: "Stemmegjenkjenning er for øyeblikket utilgjengelig. Vennligst prøv å skrive søket ditt i stedet.",
        fallback: true 
      });
    }
    
    // Since Anthropic doesn't have a native audio transcription API like Whisper,
    // we return a fallback message. In a production app, you would implement
    // integration with another speech-to-text service.
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    // Return a fallback message
    return res.json({ 
      text: "Stemmegjenkjenning er for øyeblikket utilgjengelig med Anthropic API. Vennligst skriv søket ditt i stedet.",
      fallback: true 
    });
    
  } catch (error) {
    console.error('Error handling audio:', error);
    
    // Make sure to clean up any uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ error: 'Failed to process audio' });
  }
});

// Helper function to provide basic search results without Anthropic
function provideSimpleSearchResults(query: string, res: express.Response) {
  console.log('Using simple search for query:', query);
  
  // Some hardcoded results for common locations
  const commonSearches: Record<string, Array<{
    name: string;
    address?: string;
    coordinates: [number, number];
    description?: string;
    type?: string;
  }>> = {
    'restaurant': [
      {
        name: 'Fine Dining Restaurant',
        address: '123 Main St',
        coordinates: [10.7522, 59.9139], // Oslo coordinates
        description: 'An upscale dining establishment with great food',
        type: 'restaurant'
      },
      {
        name: 'Casual Eatery',
        address: '456 Side St',
        coordinates: [10.7540, 59.9130],
        description: 'A relaxed place for a casual meal',
        type: 'restaurant'
      }
    ],
    'cafe': [
      {
        name: 'Coffee Corner',
        address: '789 Market Square',
        coordinates: [10.7500, 59.9160],
        description: 'Great coffee and pastries',
        type: 'cafe'
      }
    ],
    'park': [
      {
        name: 'Central Park',
        coordinates: [10.7400, 59.9200],
        description: 'Large urban park with walking trails',
        type: 'park'
      }
    ],
    'hotel': [
      {
        name: 'Luxury Hotel',
        address: '100 Grand Ave',
        coordinates: [10.7600, 59.9150],
        description: 'Five-star accommodations',
        type: 'hotel'
      }
    ],
    'museum': [
      {
        name: 'History Museum',
        address: '200 Culture St',
        coordinates: [10.7450, 59.9170],
        description: 'Exhibits on local and world history',
        type: 'museum'
      }
    ]
  };
  
  // Normalize the query for matching
  const normalizedQuery = query.toLowerCase().trim();
  
  // Try to find a direct match in our predefined categories
  for (const [category, places] of Object.entries(commonSearches)) {
    if (normalizedQuery.includes(category)) {
      return res.json({ places });
    }
  }
  
  // If no match, return a fallback response with Oslo as default
  return res.json({ 
    places: [
      {
        name: query,
        coordinates: [10.7522, 59.9139], // Oslo coordinates
        description: "Prøv å søke etter vanlige steder som 'restaurant', 'cafe', 'park', 'hotel', eller 'museum'."
      }
    ]
  });
}

// Endpoint for location search using Anthropic
router.post('/location-search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'No search query provided' });
    }
    
    // Check if Anthropic API key is properly configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Anthropic API key not properly configured. Using fallback search functionality.');
      return provideSimpleSearchResults(query, res);
    }
    
    try {
      const systemPrompt = `You are a location search assistant that helps find places based on user queries. 
        For each query, return a JSON object with an array of places. Each place should have:
        - name: The name of the location
        - address: The address if available
        - coordinates: [longitude, latitude] coordinates
        - description: A brief description
        - type: The type of place (restaurant, park, etc.)
        
        If the query is unclear or doesn't contain enough information to determine a specific location, 
        try to interpret what the user might be looking for based on context. If multiple interpretations
        are possible, provide 2-3 possibilities.
        
        Ensure coordinates are realistic and properly formatted as [longitude, latitude]. 
        
        Your response must be only valid JSON in this format:
        {
          "places": [
            {
              "name": "Example Place",
              "address": "123 Example St",
              "coordinates": [10.7522, 59.9139],
              "description": "An example description",
              "type": "example"
            }
          ]
        }`;
      
      const message = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: "user", content: query }
        ],
      });
      
      // Ensure we're handling the response correctly by checking its structure
      if (!message.content || message.content.length === 0) {
        throw new Error('Unexpected response format from Anthropic API');
      }
      
      const responseContent = message.content[0].type === 'text' ? message.content[0].text : '';
      
      try {
        const parsedResponse = JSON.parse(responseContent);
        
        // Validate the response structure
        if (!parsedResponse.places || !Array.isArray(parsedResponse.places)) {
          throw new Error('Invalid response structure');
        }
        
        // Ensure all places have the required fields
        for (const place of parsedResponse.places) {
          if (!place.name || !place.coordinates || !Array.isArray(place.coordinates) || place.coordinates.length !== 2) {
            throw new Error('Invalid place data');
          }
        }
        
        return res.json(parsedResponse);
      } catch (parseError) {
        console.error('Error parsing Anthropic response:', parseError, responseContent);
        return provideSimpleSearchResults(query, res);
      }
    } catch (anthropicError) {
      console.error('Anthropic API error:', anthropicError);
      return provideSimpleSearchResults(query, res);
    }
  } catch (error) {
    console.error('Error searching for location:', error);
    return res.status(500).json({ error: 'Failed to search for location' });
  }
});

// Endpoint for personalized location suggestions based on user's search history and preferences
router.post('/location-suggestions', async (req, res) => {
  try {
    const { latitude, longitude, radius, preferences, history } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    // Check if Anthropic API key is properly configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Anthropic API key not properly configured. Using fallback suggestions.');
      return res.json({ suggestions: [
        { name: "Nearby Park", type: "park", distance: "0.5 km" },
        { name: "Local Cafe", type: "cafe", distance: "0.3 km" },
        { name: "Fitness Center", type: "gym", distance: "0.8 km" }
      ]});
    }
    
    // Prepare context from user preferences and history
    let userContext = "No history or preferences available.";
    
    if (preferences) {
      const favoriteCategories = preferences.favoriteCategories || [];
      const favoriteLocations = preferences.favoriteLocations || [];
      
      if (favoriteCategories.length > 0 || favoriteLocations.length > 0) {
        userContext = "Based on your preferences: ";
        
        if (favoriteCategories.length > 0) {
          userContext += `You're interested in: ${favoriteCategories.join(', ')}. `;
        }
        
        if (favoriteLocations.length > 0) {
          userContext += `You've saved locations like: ${favoriteLocations.map(loc => loc.name).join(', ')}. `;
        }
      }
    }
    
    if (history && history.length > 0) {
      // Extract patterns from search history
      const recentSearches = history.slice(0, 10).map(item => item.query);
      const searchedCategories = history
        .filter(item => item.category)
        .map(item => item.category);
      
      // Add to context
      if (recentSearches.length > 0) {
        userContext += `You've recently searched for: ${recentSearches.join(', ')}. `;
      }
      
      if (searchedCategories.length > 0) {
        const uniqueCategories = [...new Set(searchedCategories)];
        userContext += `You've looked for categories like: ${uniqueCategories.join(', ')}. `;
      }
    }
    
    try {
      const systemPrompt = `You are a local guide assistant that suggests interesting places near a user's location.
        Generate a list of specific places within ${radius} km of the user's current location (${latitude}, ${longitude}).
        Consider their preferences and search history to personalize suggestions.
        
        Return a JSON object with an array of suggestion objects. Each suggestion should have:
        - name: A specific place name
        - type: Category (restaurant, park, museum, etc.)
        - description: Brief description of why they might like it based on their preferences
        - distance: Approximate distance from user location (in km or m)
        
        Make suggestions varied but relevant to the user's interests. Include a mix of popular spots and hidden gems.
        BE CREATIVE but REALISTIC - don't make up places that don't exist, but suggest interesting options that might be in the area.
        
        Your response must be only valid JSON in this format:
        {
          "suggestions": [
            {
              "name": "Example Place",
              "type": "category",
              "description": "A relevant description based on user preferences",
              "distance": "0.5 km"
            }
          ]
        }`;
      
      const message = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { 
            role: "user", 
            content: `I'm currently at coordinates (${latitude}, ${longitude}). ${userContext} What's interesting nearby within ${radius} km?` 
          }
        ],
      });
      
      // Ensure we're handling the response correctly by checking its structure
      if (!message.content || message.content.length === 0) {
        throw new Error('Unexpected response format from Anthropic API');
      }
      
      const responseContent = message.content[0].type === 'text' ? message.content[0].text : '';
      
      try {
        const parsedResponse = JSON.parse(responseContent);
        
        // Validate the response structure
        if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
          parsedResponse.suggestions = [];
        }
        
        return res.json(parsedResponse);
      } catch (parseError) {
        console.error('Failed to parse Anthropic response:', parseError, responseContent);
        return res.status(500).json({ error: 'Failed to parse suggestions' });
      }
    } catch (anthropicError) {
      console.error('Anthropic API error:', anthropicError);
      return res.status(500).json({ error: 'Failed to generate suggestions from Anthropic' });
    }
  } catch (error) {
    console.error('Error generating location suggestions:', error);
    return res.status(500).json({ 
      error: 'Failed to generate location suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;