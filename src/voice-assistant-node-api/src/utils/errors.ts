/**
 * Custom Error Classes
 *
 * Provides typed error handling with HTTP status codes for Express middleware.
 * Allows consistent error response formatting across the application.
 */

/**
 * Base API Error class
 * All custom errors should extend this
 */
export class ApiError extends Error {
  /**
   * HTTP status code for the error response
   * Defaults to 500 (Internal Server Error)
   */
  public readonly statusCode: number;

  /**
   * Optional additional details or data about the error
   */
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 404 Not Found Error
 * Raised when a requested resource does not exist
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 400 Bad Request Error
 * Raised when client sends invalid data
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Invalid request', details?: any) {
    super(message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 401 Unauthorized Error
 * Raised when request lacks valid authentication
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden Error
 * Raised when authenticated user lacks permission
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 409 Conflict Error
 * Raised when request conflicts with existing data (e.g., duplicate key)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 502 Bad Gateway Error
 * Raised when external service (Vapi, Twilio) fails
 */
export class ExternalServiceError extends ApiError {
  constructor(message: string = 'External service error', details?: any) {
    super(message, 502, details);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}
