import { Response } from 'express';
import { DatabaseError } from './errorHandler';
import { log } from '../vite';
import { executeWithRecovery } from './recoveryStrategies';

// Standard error response structure
export interface ErrorResponse {
  status: 'error';
  message: string;
  code: string;
  details?: any;
}

// Error codes for API responses
export enum ApiErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

// Map database error codes to HTTP status codes
const dbErrorToHttpStatus: Record<string, number> = {
  'UNIQUE_CONSTRAINT': 409,  // Conflict
  'FOREIGN_KEY_CONSTRAINT': 400, // Bad Request
  'UNDEFINED_TABLE': 500,   // Internal Server Error
  'UNDEFINED_COLUMN': 500,  // Internal Server Error
  'DB_ERROR': 500           // Internal Server Error
};

// Map database error codes to user-friendly messages
const dbErrorToUserMessage: Record<string, string> = {
  'UNIQUE_CONSTRAINT': 'This resource already exists. Please try with different information.',
  'FOREIGN_KEY_CONSTRAINT': 'The referenced resource does not exist.',
  'UNDEFINED_TABLE': 'We encountered a database issue. Our team has been notified.',
  'UNDEFINED_COLUMN': 'We encountered a database issue. Our team has been notified.',
  'DB_ERROR': 'We encountered a database issue. Our team has been notified.'
};

/**
 * Send a formatted error response
 */
export function sendErrorResponse(
  res: Response, 
  message: string, 
  statusCode: number = 500, 
  code: string = ApiErrorCode.INTERNAL_SERVER_ERROR,
  details?: any
) {
  const errorResponse: ErrorResponse = {
    status: 'error',
    message,
    code,
    ...(details && { details })
  };
  
  log(`API Error: ${code} - ${message}`, 'api');
  return res.status(statusCode).json(errorResponse);
}

/**
 * Generate a unique error ID for tracking
 */
function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Handle database errors and convert them to appropriate API responses
 * Sanitizes error details to prevent exposing internal database information
 * Implements recovery strategies when possible
 */
export async function handleApiDatabaseError(res: Response, error: any, retryOperation?: () => Promise<any>) {
  // Generate a unique error ID for tracking
  const errorId = generateErrorId();
  
  // Log the full error for server-side debugging (but sanitize sensitive data)
  const sanitizedError = { ...error };
  // Remove any potential sensitive fields
  delete sanitizedError.parameters;
  delete sanitizedError.stack;
  delete sanitizedError.query;
  
  log(`Database error details [${errorId}]: ${JSON.stringify(sanitizedError)}`, 'db-error');
  
  if (error instanceof DatabaseError) {
    const statusCode = dbErrorToHttpStatus[error.code] || 500;
    const message = dbErrorToUserMessage[error.code] || 'An unexpected error occurred';
    
    // Log with error ID for tracking
    log(`Error ID ${errorId}: Database error: ${error.code} - ${error.message}`, 'db-error');
    
    // Try recovery strategy if operation is provided and error is recoverable
    if (retryOperation && ['ETIMEDOUT', 'ECONNREFUSED', 'DB_ERROR'].includes(error.code)) {
      log(`Attempting recovery for error ${errorId}`, 'recovery');
      
      const recoveryResult = await executeWithRecovery(
        retryOperation,
        'database-operation',
        { errorId, errorCode: error.code }
      );
      
      if (recoveryResult.success) {
        log(`Recovery successful for error ${errorId}`, 'recovery');
        // If we recovered, return the successful result
        return res.json(recoveryResult.data);
      }
    }
    
    // Only send safe information to client
    return sendErrorResponse(
      res, 
      message, 
      statusCode, 
      `DB_ERROR`,
      // Only include errorId in the response for tracking
      { errorId }
    );
  }
  
  // Handle other types of errors
  log(`Error ID ${errorId}: General error: ${error.message}`, 'api-error');
  
  return sendErrorResponse(
    res, 
    'An unexpected error occurred', 
    500,
    ApiErrorCode.INTERNAL_SERVER_ERROR,
    { errorId }
  );
}

/**
 * Validate request data against a schema and return appropriate error responses
 */
export function validateRequest(res: Response, schema: any, data: any) {
  try {
    return schema.parse(data);
  } catch (error: any) {
    sendErrorResponse(
      res,
      'Validation failed. Please check your input.',
      400,
      ApiErrorCode.VALIDATION_ERROR,
      { errors: error.errors }
    );
    return null;
  }
}