import { log } from '../vite';

/**
 * Recovery strategies for different types of errors
 * These are internal recovery mechanisms that happen on the server side
 * without exposing implementation details to clients
 */

/**
 * Interface for recovery attempt result
 */
export interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Attempt to recover from a database connection error
 * Strategy: Retry the operation a few times with exponential backoff
 */
export async function attemptDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<RecoveryResult<T>> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Attempt the operation
      const result = await operation();
      
      // If successful on retry, log recovery
      if (attempt > 0) {
        log(`Successfully recovered after ${attempt + 1} attempts`, 'recovery');
      }
      
      return { success: true, data: result };
    } catch (error: any) {
      lastError = error;
      
      // Log the retry attempt
      log(`Retry attempt ${attempt + 1}/${maxRetries} failed: ${error.message}`, 'recovery');
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { 
    success: false, 
    message: lastError?.message || 'Failed after maximum retry attempts'
  };
}

/**
 * Attempt to recover from a data inconsistency error
 * Strategy: Try to automatically fix common inconsistency issues
 */
export async function attemptDataRepair<T>(
  operationWithIssue: () => Promise<T>,
  repairOperation: () => Promise<boolean>,
  fallbackOperation?: () => Promise<T>
): Promise<RecoveryResult<T>> {
  try {
    // Try the original operation first
    const result = await operationWithIssue();
    return { success: true, data: result };
  } catch (error: any) {
    log(`Attempting data repair: ${error?.message || 'Unknown error'}`, 'recovery');
    
    // Try to repair the data issue
    const repairSuccess = await repairOperation();
    
    if (repairSuccess) {
      try {
        // Try the original operation again after repair
        const result = await operationWithIssue();
        log('Data repair was successful, operation completed', 'recovery');
        return { success: true, data: result };
      } catch (secondError: any) {
        log(`Operation still failed after repair: ${secondError?.message || 'Unknown error'}`, 'recovery');
      }
    }
    
    // If repair failed or original operation still fails, try fallback
    if (fallbackOperation) {
      try {
        log('Attempting fallback operation', 'recovery');
        const fallbackResult = await fallbackOperation();
        return { success: true, data: fallbackResult };
      } catch (fallbackError: any) {
        log(`Fallback operation failed: ${fallbackError?.message || 'Unknown error'}`, 'recovery');
      }
    }
    
    return { success: false, message: 'Recovery strategy failed' };
  }
}

/**
 * Safely execute an operation with appropriate error handling and recovery
 */
export async function executeWithRecovery<T>(
  operation: () => Promise<T>,
  errorType: string,
  context: Record<string, any> = {}
): Promise<RecoveryResult<T>> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error: any) {
    // Log the error with context
    log(`Error in ${errorType}: ${error.message}`, 'error');
    log(`Error context: ${JSON.stringify(context)}`, 'error');
    
    // Different recovery strategies based on error type
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      // Database connection issues - attempt retry
      return attemptDatabaseRetry(operation);
    }
    
    // For other errors, no recovery attempt
    return { success: false, message: error.message };
  }
}