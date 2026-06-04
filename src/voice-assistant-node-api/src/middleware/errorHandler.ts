/**
 * Express Error Handler Middleware
 *
 * Centralized error handling for the entire application.
 * Catches errors from route handlers and sends consistent error responses.
 * Must be registered as the last middleware in the Express app.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Error handler middleware
 *
 * Catches all errors thrown in route handlers and async middleware.
 * Formats errors consistently and sends appropriate HTTP responses.
 *
 * Note: Must be registered after all other middleware and routes.
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error for debugging
  logger.error(`${req.method} ${req.path}`, {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Handle custom API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        statusCode: error.statusCode,
        ...(process.env.NODE_ENV === 'development' && { details: error.details }),
      },
    });
    return;
  }

  // Handle validation errors (from Joi, etc.)
  if ((error as any).isJoi) {
    res.status(400).json({
      error: {
        message: 'Validation error',
        statusCode: 400,
        details: (error as any).details?.map((d: any) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      },
    });
    return;
  }

  // Handle generic errors
  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack,
      }),
    },
  });
}

/**
 * Async error wrapper for route handlers
 *
 * Express doesn't automatically catch errors thrown in async functions.
 * This wrapper catches those errors and passes them to the error handler middleware.
 *
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   throw new Error('Something went wrong');
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
