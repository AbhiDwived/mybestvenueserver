// Standard response structure
class ApiResponse {
  constructor(success, message, data = null, meta = null) {
    this.success = success;
    this.message = message;
    if (data !== null) this.data = data;
    if (meta !== null) this.meta = meta;
    this.timestamp = new Date().toISOString();
    this.apiVersion = 'v1'; // Current API version
  }
}

// Success responses
export const successResponse = (res, message, data = null, meta = null) => {
  try {
    const response = new ApiResponse(true, message, data, meta);
    console.log('Sending success response:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error creating success response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating response',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1'
    });
  }
};

export const createdResponse = (res, message, data = null, meta = null) => {
  try {
    const response = new ApiResponse(true, message, data, meta);
    console.log('Sending created response:', response);
    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating created response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating response',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1'
    });
  }
};

// Error responses
export const errorResponse = (res, message, meta = null, statusCode = 500) => {
  try {
    const response = new ApiResponse(false, message, null, meta);
    console.log('Sending error response:', response);
    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Error creating error response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating response',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1'
    });
  }
};

export const validationErrorResponse = (res, errors) => {
  try {
    const response = new ApiResponse(false, 'Validation Error', null, { errors });
    console.log('Sending validation error response:', response);
    return res.status(400).json(response);
  } catch (error) {
    console.error('Error creating validation error response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating response',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1'
    });
  }
};

export const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  try {
    const response = new ApiResponse(false, message);
    console.log('Sending unauthorized response:', response);
    return res.status(401).json(response);
  } catch (error) {
    console.error('Error creating unauthorized response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating response',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1'
    });
  }
};

export const forbiddenResponse = (res, message = 'Access forbidden') => {
  try {
    const response = new ApiResponse(false, message);
    console.log('Sending forbidden response:', response);
    return res.status(403).json(response);
  } catch (error) {
    console.error('Error creating forbidden response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating response',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1'
    });
  }
};

export const notFoundResponse = (res, message = 'Resource not found') => {
  try {
    const response = new ApiResponse(false, message);
    console.log('Sending not found response:', response);
    return res.status(404).json(response);
  } catch (error) {
    console.error('Error creating not found response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating response',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1'
    });
  }
};

// Validation middleware
export const validateRequest = (validationSchema) => {
  return (req, res, next) => {
    // Skip validation if no schema provided
    if (!validationSchema || !validationSchema.validate) {
      return next();
    }

    // Run validation using our custom validation system
    const errors = validationSchema.validate(req);

    // Check if there are any errors
    const hasErrors = Object.values(errors).some(field => 
      Array.isArray(field) && field.length > 0
    );

    if (hasErrors) {
      // Filter out empty error arrays
      const filteredErrors = Object.fromEntries(
        Object.entries(errors).filter(([_, value]) => 
          Array.isArray(value) && value.length > 0
        )
      );
      return validationErrorResponse(res, filteredErrors);
    }

    next();
  };
}; 