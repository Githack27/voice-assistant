/**
 * Validation Middleware
 *
 * Middleware for validating request body, query parameters, and path parameters.
 * Uses Joi schemas to validate data before reaching route handlers.
 * Automatically catches validation errors and sends appropriate responses.
 */

import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ValidationError } from '../utils/errors.js';

/**
 * Validates request body against a Joi schema
 *
 * Usage:
 * router.post('/clients', validateBody(clientSchema.create), createClient);
 */
export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Validate request body against the provided schema
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Get all validation errors, not just first
      stripUnknown: true, // Remove unknown properties from object
    });

    if (error) {
      // Format validation errors for client response
      const messages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Request validation failed', messages);
    }

    // Replace request body with validated (cleaned) data
    req.body = value;
    next();
  };
}

/**
 * Validates request query parameters against a Joi schema
 *
 * Usage:
 * router.get('/calls', validateQuery(callQuerySchema), getCalls);
 */
export function validateQuery(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Query validation failed', messages);
    }

    // Replace query parameters with validated data
    req.query = value;
    next();
  };
}

/**
 * Validates request path parameters against a Joi schema
 *
 * Usage:
 * router.get('/calls/:id', validateParams(Joi.object({ id: Joi.string().uuid() })), getCall);
 */
export function validateParams(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Parameter validation failed', messages);
    }

    // Replace path parameters with validated data
    req.params = value;
    next();
  };
}
