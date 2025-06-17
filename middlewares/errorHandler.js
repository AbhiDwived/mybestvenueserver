import AppError from '../utils/AppError.js';
import { serverErrorResponse, clientErrorResponse } from '../utils/responseHandler.js';
import mongoose from 'mongoose';

// Handle Mongoose validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return new AppError('Invalid input data', 400, errors);
};

// Handle Mongoose duplicate field errors
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${value}. Please use another value for ${field}.`;
  return new AppError(message, 400);
};

// Handle Mongoose cast errors (invalid IDs)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);

// Handle JWT expiration errors
const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);

// Development error response with full details
const sendErrorDev = (err, res) => {
  serverErrorResponse(res, err);
};

// Production error response with limited details
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    clientErrorResponse(res, err.statusCode, err.message, err.errors);
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for debugging
    console.error('ERROR 💥', err);
    
    // Send generic message
    serverErrorResponse(res, new Error('Something went wrong'));
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Log all errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR DETAILS:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    });
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error instanceof mongoose.Error) error = handleValidationErrorDB(error);

    sendErrorProd(error, res);
  }
};

// Catch async errors
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Handle 404 errors
export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

export default errorHandler;
  