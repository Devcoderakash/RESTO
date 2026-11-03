import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    const message = formatted.map((f) => `${f.path}: ${f.message}`).join(', ') || 'Validation failed';
    res.status(400).json({
      success: false,
      message,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: formatted,
      },
    });
    return;
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.name,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 3. PostgreSQL Unique Constraint Violation (23505)
  if (err?.code === '23505') {
    const message = 'A record with these unique details already exists';
    res.status(409).json({
      success: false,
      message,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message,
        details: err.detail,
      },
    });
    return;
  }

  // 4. PostgreSQL Foreign Key Constraint Violation (23503)
  if (err?.code === '23503') {
    const message = 'Referenced entity does not exist or cannot be deleted';
    res.status(400).json({
      success: false,
      message,
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message,
        details: err.detail,
      },
    });
    return;
  }

  // 5. Unhandled / Internal Errors
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled server exception');
  const message = 'An unexpected server error occurred';
  res.status(500).json({
    success: false,
    message,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
  });
}

