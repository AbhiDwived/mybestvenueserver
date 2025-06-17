import { API_VALIDATION } from '../config/apiConfig.js';

// Validation helper functions
const isValidString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidNumber = (value) => !isNaN(value) && Number.isFinite(Number(value));
const isValidDate = (value) => !isNaN(Date.parse(value));

// File type validation helper
const ALLOWED_MIME_TYPES = API_VALIDATION.FILE.ALLOWED_TYPES;
const MAX_FILE_SIZE = API_VALIDATION.FILE.MAX_SIZE;

// Validate file object
const validateFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('File is required');
    return errors;
  }

  if (!file.originalname || !isValidString(file.originalname)) {
    errors.push('Invalid file name');
  }

  if (!file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed');
  }

  if (!file.size || file.size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  return errors;
};

// Validation schemas
export const uploadValidations = {
  // GET /files/:userType
  getFiles: {
    validate: (params = {}, query = {}) => {
      const errors = {
        params: [],
        query: []
      };

      // Validate params
      if (!params.userType || !['users', 'vendors', 'admin'].includes(params.userType)) {
        errors.params.push('Invalid user type');
      }

      // Validate query
      const page = parseInt(query.page);
      const limit = parseInt(query.limit);

      if (query.page && (!isValidNumber(page) || page < 1)) {
        errors.query.push('Page must be a positive number');
      }

      if (query.limit && (!isValidNumber(limit) || limit < 1 || limit > API_VALIDATION.PAGINATION.MAX_LIMIT)) {
        errors.query.push(`Limit must be between 1 and ${API_VALIDATION.PAGINATION.MAX_LIMIT}`);
      }

      return errors;
    }
  },

  // POST /single
  singleUpload: {
    validate: (req) => {
      const errors = {
        file: []
      };

      const fileErrors = validateFile(req.file);
      if (fileErrors.length > 0) {
        errors.file = fileErrors;
      }

      return errors;
    }
  },

  // POST /multiple
  multipleUpload: {
    validate: (req) => {
      const errors = {
        files: []
      };

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        errors.files.push('No files uploaded');
        return errors;
      }

      if (req.files.length > 5) {
        errors.files.push('Maximum 5 files allowed');
        return errors;
      }

      req.files.forEach((file, index) => {
        const fileErrors = validateFile(file);
        if (fileErrors.length > 0) {
          errors.files.push(`File ${index + 1}: ${fileErrors.join(', ')}`);
        }
      });

      return errors;
    }
  },

  // GET /metrics
  getMetrics: {
    validate: (query = {}) => {
      const errors = {
        query: []
      };

      if (query.startDate && !isValidDate(query.startDate)) {
        errors.query.push('Invalid start date format');
      }

      if (query.endDate && !isValidDate(query.endDate)) {
        errors.query.push('Invalid end date format');
      }

      if (query.startDate && query.endDate) {
        const start = new Date(query.startDate);
        const end = new Date(query.endDate);
        if (end < start) {
          errors.query.push('End date must be after start date');
        }
      }

      return errors;
    }
  }
}; 