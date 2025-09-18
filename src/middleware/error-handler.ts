import type { Context } from 'hono';
import type { ErrorResponse } from '../types/index.js';

/**
 * Error handling middleware
 */

export function createErrorHandler() {
  return (err: Error, c: Context) => {
    console.error('Unhandled error:', err);

    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      message: err.message,
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  };
}

export function createNotFoundHandler() {
  return (c: Context) => {
    const errorResponse: ErrorResponse = {
      error: 'Not found',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 404);
  };
}
