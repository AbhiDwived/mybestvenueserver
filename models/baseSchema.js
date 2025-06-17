import mongoose from 'mongoose';

// Common options for string fields with basic validation
export const stringRequired = {
  type: String,
  required: [true, 'This field is required'],
  trim: true
};

export const stringOptional = {
  type: String,
  trim: true
};

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// Phone validation regex (international format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Common schema options
export const schemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
};

// Base schema fields that are common across models
export const baseFields = {
  isActive: {
    type: Boolean,
    default: true,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
};

// Validation for email fields
export const emailField = {
  type: String,
  required: [true, 'Email is required'],
  unique: true,
  lowercase: true,
  trim: true,
  validate: {
    validator: function(v) {
      return emailRegex.test(v);
    },
    message: 'Please enter a valid email address'
  }
};

// Validation for phone fields
export const phoneField = {
  type: String,
  required: [true, 'Phone number is required'],
  trim: true,
  validate: {
    validator: function(v) {
      return phoneRegex.test(v);
    },
    message: 'Please enter a valid phone number'
  }
};

// Password validation
export const passwordField = {
  type: String,
  required: [true, 'Password is required'],
  minlength: [8, 'Password must be at least 8 characters long'],
  select: false,
  validate: {
    validator: function(v) {
      // At least one uppercase, one lowercase, one number, one special character
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      return passwordRegex.test(v);
    },
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  }
};

// URL validation
export const urlField = {
  type: String,
  trim: true,
  validate: {
    validator: function(v) {
      if (!v) return true; // Allow empty values
      try {
        new URL(v);
        return true;
      } catch (err) {
        return false;
      }
    },
    message: 'Please enter a valid URL'
  }
};

// Pre-save middleware to update timestamps
export const updateTimestamps = function(next) {
  this.updatedAt = Date.now();
  next();
};

// Query middleware to exclude inactive documents
export const excludeInactive = function() {
  this.where({ isActive: { $ne: false } });
};

// Plugin to add common functionality to all schemas
export const basePlugin = (schema) => {
  // Add timestamps
  schema.pre('save', updateTimestamps);
  
  // Add query middleware
  schema.pre(/^find/, excludeInactive);
  
  // Add common methods
  schema.methods.softDelete = async function() {
    this.isActive = false;
    return this.save();
  };
  
  // Add common statics
  schema.statics.findActive = function() {
    return this.find({ isActive: true });
  };
}; 