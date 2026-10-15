/**
 * Global error handler — catches all errors and returns structured JSON.
 *
 * R9 applies here: if the error handler itself fails, Express's default
 * handler catches it, which is acceptable.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('errorHandler');

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Unexpected error — log full stack, return generic message
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    },
  });
}
