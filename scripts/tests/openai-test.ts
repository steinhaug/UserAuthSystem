import OpenAI from 'openai';
import * as dotenv from 'dotenv';
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

async function testOpenAI() {
  console.log('\x1b[36m=== Testing OpenAI API Connection ===\x1b[0m');
  
  // Check if API key is set
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('\x1b[31mERROR: OPENAI_API_KEY environment variable is not set\x1b[0m');
    process.exit(1);
  }
  
  console.log('OpenAI API key found');
  
  try {
    // Initialize OpenAI client
    console.log('Initializing OpenAI client...');
    const openai = new OpenAI({ apiKey });
    
    // Test with a simple request
    console.log('Testing API with a simple request...');
    
    const testPrompt = 'Hi there, this is a test of the OpenAI API connection. Please respond with a short confirmation.';
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // The newest OpenAI model is gpt-4o which was released May 13, 2024
      messages: [{ role: "user", content: testPrompt }],
      max_tokens: 50
    });
    
    if (response && response.choices && response.choices.length > 0) {
      console.log('\x1b[32m✓ OpenAI API request successful\x1b[0m');
      console.log('Response preview:');
      console.log(`\x1b[33m${response.choices[0].message.content.trim().substring(0, 100)}...\x1b[0m`);
      
      // Show API usage information
      if (response.usage) {
        console.log('\nAPI Usage:');
        console.log(`- Prompt tokens: ${response.usage.prompt_tokens}`);
        console.log(`- Completion tokens: ${response.usage.completion_tokens}`);
        console.log(`- Total tokens: ${response.usage.total_tokens}`);
      }
    } else {
      throw new Error('Unexpected API response format');
    }
    
    console.log('\n\x1b[32m✓ OpenAI API test completed successfully!\x1b[0m');
    
  } catch (error) {
    console.error('\x1b[31mERROR: Failed to connect to OpenAI API\x1b[0m');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data.error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testOpenAI().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});