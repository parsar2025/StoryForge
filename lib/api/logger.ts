/**
 * Logging Utility
 * 
 * Provides structured logging for API errors and important events.
 * Per design document: logs to console in development, structured JSON
 * in production (prepared for CloudWatch/equivalent).
 */

export interface LogContext {
  userId?: string;
  characterId?: string;
  path?: string;
  method?: string;
  affectedResources?: Record<string, string | string[]>;
  retryAttempts?: number;
  transactionState?: string;
}

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  errorType?: string;
  errorMessage?: string;
  stack?: string;
  context?: LogContext;
}

/**
 * Log an error with structured context.
 * 
 * In development: pretty-printed to console with colors
 * In production: structured JSON for log aggregation
 * 
 * @param error - Error object or error message
 * @param context - Additional context (userId, path, affected resources, etc.)
 * @param level - Log level (default: 'error')
 */
export function logError(
  error: Error | string,
  context?: LogContext,
  level: 'error' | 'warn' | 'info' = 'error'
): void {
  const isDev = process.env.NODE_ENV === 'development';
  
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof error === 'string' ? error : error.message,
    errorType: error instanceof Error ? error.constructor.name : undefined,
    errorMessage: error instanceof Error ? error.message : undefined,
    stack: isDev && error instanceof Error ? error.stack : undefined,
    context
  };
  
  if (isDev) {
    // Pretty-print for development
    const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';
    
    console.log(`${color}[${level.toUpperCase()}]${reset} ${entry.timestamp}`);
    console.log(`${color}Message:${reset}`, entry.message);
    
    if (entry.errorType) {
      console.log(`${color}Type:${reset}`, entry.errorType);
    }
    
    if (context) {
      console.log(`${color}Context:${reset}`, JSON.stringify(context, null, 2));
    }
    
    if (entry.stack) {
      console.log(`${color}Stack:${reset}\n`, entry.stack);
    }
    
    console.log(''); // Empty line for readability
  } else {
    // Structured JSON for production log aggregation
    console.log(JSON.stringify(entry));
  }
}

/**
 * Log a transaction failure with detailed context.
 * 
 * Includes affected resource IDs and transaction state for debugging.
 * Used specifically for database transaction errors.
 */
export function logTransactionFailure(
  error: Error,
  affectedResources: Record<string, string | string[]>,
  transactionState?: string,
  retryAttempts?: number
): void {
  logError(error, {
    affectedResources,
    transactionState,
    retryAttempts
  });
}

/**
 * Log an info-level message (non-error logging).
 * 
 * Use sparingly - primarily for important state transitions or
 * successful completion of critical operations.
 */
export function logInfo(message: string, context?: LogContext): void {
  logError(message, context, 'info');
}

/**
 * Log a warning (potential issues that aren't errors).
 */
export function logWarning(message: string, context?: LogContext): void {
  logError(message, context, 'warn');
}
