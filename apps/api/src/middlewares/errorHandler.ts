import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle Mongoose Validation Errors
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map(e => e.message);
    logger.error('Validation Error', { errors, path: req.path });

    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
    return;
  }

  // Handle Mongoose Cast Errors (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    logger.error('Cast Error', { path: err.path, value: err.value });

    res.status(400).json({
      status: 'error',
      message: `Invalid ${err.path}: ${err.value}`
    });
    return;
  }

  // Handle Mongoose Duplicate Key Errors
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    logger.error('Duplicate Key Error', { field });

    res.status(409).json({
      status: 'error',
      message: `${field} already exists`
    });
    return;
  }

  // Handle Custom AppError
  if (err instanceof AppError) {
    logger.error(`AppError: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    });

    res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
    return;
  }

  // Handle Unknown Errors
  logger.error(`Unexpected Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};