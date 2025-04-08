import { Response } from 'express';
import { DatabaseError } from './errorHandler';
import { log } from '../vite';

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
 * Handle database errors and convert them to appropriate API responses
 */
export function handleApiDatabaseError(res: Response, error: any) {
  if (error instanceof DatabaseError) {
    const statusCode = dbErrorToHttpStatus[error.code] || 500;
    const message = dbErrorToUserMessage[error.code] || 'An unexpected error occurred';
    
    return sendErrorResponse(
      res, 
      message, 
      statusCode, 
      `DB_${error.code}`,
      process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined
    );
  }
  
  // Handle other types of errors
  return sendErrorResponse(
    res, 
    'An unexpected error occurred', 
    500,
    ApiErrorCode.INTERNAL_SERVER_ERROR,
    process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
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