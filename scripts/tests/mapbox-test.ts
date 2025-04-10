import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Resolve .env file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const envPath = path.resolve(rootDir, '.env');

// Load environment variables
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env file found, using process.env');
  dotenv.config();
}

async function testMapbox() {
  console.log('\x1b[36m=== Testing Mapbox API Token ===\x1b[0m');
  
  // Check if Mapbox token is set
  const mapboxToken = process.env.VITE_MAPBOX_TOKEN;
  
  if (!mapboxToken) {
    console.error('\x1b[31mERROR: VITE_MAPBOX_TOKEN environment variable is not set\x1b[0m');
    process.exit(1);
  }
  
  console.log(`Mapbox token found (length: ${mapboxToken.length})`);
  
  // Test token by making a request to Mapbox API
  try {
    console.log('Testing Mapbox token with API request...');
    
    // Use a simple geocoding request to test the token
    const testLocation = 'Oslo, Norway';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(testLocation)}.json?access_token=${mapboxToken}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      if (data && data.features && data.features.length > 0) {
        const place = data.features[0];
        const center = place.center || ['unknown', 'unknown'];
        console.log(`\x1b[32m✓ Mapbox API request successful\x1b[0m`);
        console.log(`Geocoded "${testLocation}" to coordinates: [${center.join(', ')}]`);
      } else {
        console.log(`\x1b[33m⚠ Mapbox API returned no results for "${testLocation}"\x1b[0m`);
      }
    } else {
      console.error(`\x1b[31mERROR: Mapbox API request failed with status ${response.status}\x1b[0m`);
      const errorMessage = typeof data === 'object' && data !== null && 'message' in data 
        ? data.message 
        : 'Unknown error';
      console.error(`Error message: ${errorMessage}`);
      process.exit(1);
    }
    
    console.log('\n\x1b[32m✓ Mapbox API token test completed successfully!\x1b[0m');
    
  } catch (error) {
    console.error('\x1b[31mERROR: Failed to test Mapbox API token\x1b[0m');
    console.error(error);
    process.exit(1);
  }
}

testMapbox().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});