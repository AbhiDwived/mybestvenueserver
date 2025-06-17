/**
 * Standard success response
 */
export const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    status: 'success',
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(response);
};

/**
 * Error response for client errors (400-499)
 */
export const clientErrorResponse = (res, statusCode = 400, message = 'Bad Request', errors = []) => {
  const response = {
    status: 'fail',
    message,
    ...(errors.length > 0 && { errors }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(response);
};

/**
 * Error response for server errors (500-599)
 */
export const serverErrorResponse = (res, error) => {
  const response = {
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString()
  };
  return res.status(500).json(response);
};

/**
 * Validation error response
 */
export const validationErrorResponse = (res, errors) => {
  const response = {
    status: 'fail',
    message: 'Validation Error',
    errors: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString()
  };
  return res.status(422).json(response);
};

/**
 * Authentication error response
 */
export const authErrorResponse = (res, message = 'Authentication failed') => {
  const response = {
    status: 'fail',
    message,
    timestamp: new Date().toISOString()
  };
  return res.status(401).json(response);
};

/**
 * Authorization error response
 */
export const forbiddenResponse = (res, message = 'Access denied') => {
  const response = {
    status: 'fail',
    message,
    timestamp: new Date().toISOString()
  };
  return res.status(403).json(response);
};

/**
 * Not found error response
 */
export const notFoundResponse = (res, message = 'Resource not found') => {
  const response = {
    status: 'fail',
    message,
    timestamp: new Date().toISOString()
  };
  return res.status(404).json(response);
}; 