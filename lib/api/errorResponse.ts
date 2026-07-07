/**
 * Error Response Utilities
 * 
 * Provides consistent error formatting across all API endpoints.
 * Per design document Error Handling section: all errors follow the same
 * JSON structure with error message, optional details, and error code.
 */

/**
 * Standard error codes used across the API.
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',     // 400 - Invalid input
  UNAUTHORIZED = 'UNAUTHORIZED',             // 401 - Not authenticated
  NOT_FOUND = 'NOT_FOUND',                   // 404 - Resource doesn't exist
  CONFLICT = 'CONFLICT',                     // 409 - State conflict (e.g., activity in progress)
  TRANSACTION_FAILED = 'TRANSACTION_FAILED', // 500 - Database transaction error
  INTERNAL_ERROR = 'INTERNAL_ERROR'          // 500 - Unexpected error
}

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
  error: string;
  details?: string[];
  code: ErrorCode;
}

/**
 * Format an error response with consistent structure.
 * 
 * @param message - Human-readable error message
 * @param code - Error code from ErrorCode enum
 * @param details - Optional array of specific validation errors or context
 * @returns ErrorResponse object ready to be returned as JSON
 * 
 * @example
 * formatErrorResponse(
 *   'Invalid tree IDs provided',
 *   ErrorCode.VALIDATION_ERROR,
 *   ['tree_123 does not exist', 'tree_456 belongs to another character']
 * )
 */
export function formatErrorResponse(
  message: string,
  code: ErrorCode,
  details?: string[]
): ErrorResponse {
  const response: ErrorResponse = {
    error: message,
    code
  };
  
  if (details && details.length > 0) {
    response.details = details;
  }
  
  return response;
}

/**
 * Create a NextResponse with formatted error and appropriate status code.
 * 
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (400, 401, 404, 409, 500)
 * @param code - Error code from ErrorCode enum
 * @param details - Optional array of specific validation errors
 * @returns NextResponse with JSON error payload
 */
export function errorResponse(
  message: string,
  statusCode: number,
  code: ErrorCode,
  details?: string[]
): Response {
  return Response.json(
    formatErrorResponse(message, code, details),
    { status: statusCode }
  );
}

/**
 * Common error response helpers for frequently used cases.
 */
export const ErrorResponses = {
  /**
   * 401 Unauthorized - No valid session
   */
  unauthorized(message = 'Authentication required'): Response {
    return errorResponse(message, 401, ErrorCode.UNAUTHORIZED);
  },
  
  /**
   * 404 Not Found - Resource doesn't exist or doesn't belong to user
   */
  notFound(resource = 'Resource'): Response {
    return errorResponse(`${resource} not found`, 404, ErrorCode.NOT_FOUND);
  },
  
  /**
   * 400 Validation Error - Invalid input
   */
  validation(message: string, details?: string[]): Response {
    return errorResponse(message, 400, ErrorCode.VALIDATION_ERROR, details);
  },
  
  /**
   * 409 Conflict - State conflict (e.g., activity already in progress)
   */
  conflict(message: string): Response {
    return errorResponse(message, 409, ErrorCode.CONFLICT);
  },
  
  /**
   * 500 Transaction Failed - Database transaction error
   */
  transactionFailed(message = 'Failed to complete operation'): Response {
    return errorResponse(message, 500, ErrorCode.TRANSACTION_FAILED);
  },
  
  /**
   * 500 Internal Error - Unexpected error
   */
  internal(message = 'Internal server error'): Response {
    return errorResponse(message, 500, ErrorCode.INTERNAL_ERROR);
  }
};
