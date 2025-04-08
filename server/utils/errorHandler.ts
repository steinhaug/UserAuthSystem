import { log } from '../vite';

// Custom error class for database errors
export class DatabaseError extends Error {
  constructor(message: string, public readonly code: string, public readonly originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error handler function for database operations
export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  source: string = 'database'
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    log(`Database error: ${errorMessage} - ${error.message}`, source);
    
    // Determine error type and code
    let code = 'DB_ERROR';
    if (error.code === '23505') {
      code = 'UNIQUE_CONSTRAINT';
    } else if (error.code === '23503') {
      code = 'FOREIGN_KEY_CONSTRAINT';
    } else if (error.code === '42P01') {
      code = 'UNDEFINED_TABLE';
    } else if (error.code === '42703') {
      code = 'UNDEFINED_COLUMN';
    }
    
    throw new DatabaseError(errorMessage, code, error);
  }
}