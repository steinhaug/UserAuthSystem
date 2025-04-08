import express from 'express';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI with API key from environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = express.Router();

// Set up multer for handling audio file uploads
const upload = multer({ 
  dest: 'temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Check if OpenAI API key is available
router.get('/check', (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'OpenAI API key not configured. Please add it to your environment variables.' 
    });
  }
  
  return res.json({ 
    status: 'success', 
    message: 'OpenAI API key is configured.'
  });
});

// Endpoint for transcribing audio to text
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const filePath = req.file.path;
    
    // Transcribe the audio using OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "en",
    } as any); // Type assertion to fix TypeScript error
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    // Return the transcription
    return res.json({ text: transcription.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Endpoint for location search using OpenAI
router.post('/location-search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'No search query provided' });
    }
    
    // Use OpenAI to parse the search query and generate location data
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: `You are a location search assistant that helps find places based on user queries. 
            For each query, return a JSON object with an array of places. Each place should have:
            - name: The name of the location
            - address: The address if available
            - coordinates: [longitude, latitude] coordinates
            - description: A brief description
            - type: The type of place (restaurant, park, etc.)
            
            If the query is unclear or doesn't contain enough information to determine a specific location, 
            try to interpret what the user might be looking for based on context. If multiple interpretations
            are possible, provide 2-3 possibilities.
            
            Ensure coordinates are realistic and properly formatted as [longitude, latitude].`
        },
        { 
          role: "user", 
          content: query
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    // Extract the response content
    const responseContent = completion.choices[0].message.content;
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseContent || '{"places":[]}');
      
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
      console.error('Error parsing OpenAI response:', parseError, responseContent);
      
      // Fallback response with a simple structure
      return res.json({ 
        places: [
          {
            name: query,
            coordinates: [0, 0], // Default coordinates
            description: "Location information could not be generated accurately. Please try a more specific search."
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error searching for location:', error);
    return res.status(500).json({ error: 'Failed to search for location' });
  }
});

export default router;