import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API errors with status codes.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Centralized error-handling middleware.
 * Returns consistent JSON error shapes for all errors.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Don't spam the console for expected unauthenticated errors (like missing tokens)
  if (!(err instanceof AppError && err.statusCode === 401)) {
    console.error(`[Error] ${err.name}: ${err.message}`);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.message,
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as unknown as { code: number }).code === 11000) {
    res.status(409).json({
      success: false,
      message: 'A record with that value already exists',
    });
    return;
  }

  // Default: internal server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
