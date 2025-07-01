// Import the logger
import { logger } from '../utils/logger.js';

// Custom error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error details with logger instead of console
  logger.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      details: err.message
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({
      status: 'error',
      message: 'Duplicate Key Error',
      details: err.message
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token Expired',
      details: 'Please login again'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid Token',
      details: 'Please login again'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
  