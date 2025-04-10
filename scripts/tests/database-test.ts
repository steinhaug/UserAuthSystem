import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../shared/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

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

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('\x1b[31mERROR: DATABASE_URL environment variable is not set\x1b[0m');
  process.exit(1);
}

async function testDatabase() {
  console.log('\x1b[36m=== Testing PostgreSQL Database Connection ===\x1b[0m');
  
  try {
    // Create connection pool
    console.log('Creating connection pool...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Initialize Drizzle
    console.log('Initializing Drizzle ORM...');
    const db = drizzle({ client: pool, schema });
    
    // Test simple query
    console.log('Testing basic query...');
    const { rows } = await pool.query('SELECT NOW() as current_time');
    console.log(`\x1b[32mDatabase server time: ${rows[0].current_time}\x1b[0m`);
    
    // Test schema tables
    console.log('\nVerifying database schema...');
    
    // Get list of table names from drizzle schema
    const tableNames = Object.keys(schema)
      .filter(key => typeof schema[key] === 'object' && schema[key]?.$type === 'table')
      .map(key => schema[key]._.name);
    
    console.log(`Found ${tableNames.length} tables in Drizzle schema`);
    
    // Check if tables exist in database
    const { rows: tableRows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tableRows.map(row => row.table_name);
    console.log(`Found ${existingTables.length} tables in database`);
    
    // Compare tables
    const missingTables = tableNames.filter(name => !existingTables.includes(name));
    
    if (missingTables.length > 0) {
      console.log('\x1b[33mWarning: Some tables defined in the schema are missing in the database:\x1b[0m');
      missingTables.forEach(table => console.log(`  - ${table}`));
      console.log('\nYou may need to run migrations to create these tables.');
    } else {
      console.log('\x1b[32mAll schema tables exist in the database\x1b[0m');
    }
    
    // Close connection
    console.log('\nClosing database connection...');
    await pool.end();
    
    console.log('\x1b[32m✓ Database connection test completed successfully!\x1b[0m');
    
  } catch (error) {
    console.error('\x1b[31mERROR: Failed to connect to the database\x1b[0m');
    console.error(error);
    process.exit(1);
  }
}

testDatabase().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});