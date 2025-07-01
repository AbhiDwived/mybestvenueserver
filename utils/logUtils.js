import { logger } from './logger.js';

// For controllers
export const logControllerError = (controller, action, error, metadata = {}) => {
  logger.error(`${controller}Controller | ${action} failed:`, {
    error: error.message,
    ...metadata,
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// For middleware
export const logMiddlewareError = (middleware, error, req) => {
  logger.error(`${middleware} | Error:`, {
    error: error.message,
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'unauthenticated'
  });
}; 