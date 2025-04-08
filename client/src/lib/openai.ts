import OpenAI from "openai";

// Initialize the OpenAI client
// Note: We'll be using server-side proxy for API calls to protect the API key
const openai = new OpenAI({
  apiKey: 'placeholder', // The real key will be used server-side
  dangerouslyAllowBrowser: true // Only for development
});

// Function to transcribe audio to text
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Create a form data object to send the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    
    // Send the audio file to our server-side proxy
    const response = await fetch('/api/openai/transcribe', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

// Function to search for a location using OpenAI
export async function searchLocationWithAI(query: string): Promise<{
  places: Array<{
    name: string;
    address?: string;
    coordinates: [number, number]; // [longitude, latitude]
    description?: string;
    type?: string;
  }>;
}> {
  try {
    // Send the query to our server-side proxy
    const response = await fetch('/api/openai/location-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching location with AI:', error);
    throw error;
  }
}