// Validation middleware
import Joi from 'joi';
import mongoose from 'mongoose';

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId Validation');

// User validation schemas
export const userValidation = {
  register: Joi.object({
    name: Joi.string().required().min(3).max(50).messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),
    email: Joi.string().required().email({
      minDomainSegments: 2,
      tlds: { allow: ['com', 'net', 'org', 'edu', 'in'] }
    }).messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address',
      'string.minDomainSegments': 'Email domain is invalid'
    }),
    phone: Joi.string().required().pattern(/^[6-9]\d{9}$/).messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Please enter a valid Indian mobile number'
    }),
    password: Joi.string().required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/)
      .messages({
      'string.empty': 'Password is required',
        'string.pattern.base': 'Password must:\n- Be 8-20 characters long\n- Include at least 1 uppercase letter\n- Include at least 1 lowercase letter\n- Include at least 1 number\n- Include at least 1 special character (@$!%*?&)'
      }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).messages({
      'any.only': 'Passwords do not match'
    }),
    termsAccepted: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must agree to the terms and conditions'
    }),
    profilePhoto: Joi.string().uri().allow('')
  }),
  login: Joi.object({
    email: Joi.string().required().email({
      minDomainSegments: 2,
      tlds: { allow: ['com', 'net', 'org', 'edu', 'in'] }
    }).messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),
    password: Joi.string().required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/)
      .messages({
        'string.empty': 'Password is required',
        'string.pattern.base': 'Password must:\n- Be 8-20 characters long\n- Include at least 1 uppercase letter\n- Include at least 1 lowercase letter\n- Include at least 1 number\n- Include at least 1 special character (@$!%*?&)'
    })
  }),
  updateProfile: Joi.object({
    name: Joi.string().required().min(3).max(50),
    email: Joi.string().required().email(),
    phone: Joi.string().required().pattern(/^[0-9]{10}$/),
    address: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    country: Joi.string().allow(''),
    weddingDate: Joi.date().iso().allow(null),
    profilePhoto: Joi.string().uri().allow(''),
    isVerified: Joi.boolean()
  })
};

// Vendor validation schemas
export const vendorValidation = {
  register: Joi.object({
    businessName: Joi.string().required().min(3).max(100).messages({
      'string.empty': 'Business name is required',
      'string.min': 'Business name must be at least 3 characters long',
      'string.max': 'Business name cannot exceed 100 characters'
    }),
    vendorType: Joi.string().required().messages({
      'string.empty': 'Vendor type is required'
    }),
    contactName: Joi.string().required().min(3).max(50).messages({
      'string.empty': 'Contact name is required',
      'string.min': 'Contact name must be at least 3 characters long'
    }),
    email: Joi.string().required().email().messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email'
    }),
    phone: Joi.string().required().pattern(/^[0-9]{10}$/).messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be 10 digits'
    }),
    password: Joi.string().required().min(6).messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long'
    }),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      zipCode: Joi.string()
    }),
    serviceAreas: Joi.array().items(Joi.string()),
    description: Joi.string().max(1000),
    yearsInBusiness: Joi.number().integer().min(0),
    pricingRange: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(Joi.ref('min')),
      currency: Joi.string().default('INR')
    }),
    termsAccepted: Joi.boolean().valid(true).required().messages({
      'boolean.base': 'Terms acceptance is required',
      'any.only': 'You must accept the terms and conditions'
    }),
    profilePicture: Joi.string().uri().allow(''),
    status: Joi.string().valid('Active', 'InActive'),
    socialMediaLinks: Joi.object({
      facebook: Joi.string().uri().allow(''),
      instagram: Joi.string().uri().allow(''),
      twitter: Joi.string().uri().allow(''),
      linkedin: Joi.string().uri().allow(''),
      others: Joi.string().uri().allow('')
    }),
    galleryImages: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        uploadedAt: Joi.date()
      })
    ),
    paymentMethods: Joi.array().items(Joi.string()),
    packagePrices: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        price: Joi.number().required().min(0),
        description: Joi.string()
      })
    )
  }),
  updateProfile: Joi.object({
    _id: Joi.string(),
    businessName: Joi.string().min(3).max(100).optional(),
    contactName: Joi.string().min(3).max(50).optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    vendorType: Joi.string().optional(),
    description: Joi.string().max(1000).optional(),
    serviceAreas: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ).optional(),
    pricing: Joi.alternatives().try(
      Joi.string(),
      Joi.number()
    ).optional(),
    website: Joi.string().uri().allow('').optional(),
    profilePicture: Joi.any().optional(),
    termsAccepted: Joi.boolean().optional(),
    isApproved: Joi.boolean().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional(),
    socialMediaLinks: Joi.object({
      facebook: Joi.string().uri().allow('').optional(),
      instagram: Joi.string().uri().allow('').optional(),
      twitter: Joi.string().uri().allow('').optional(),
      linkedin: Joi.string().uri().allow('').optional(),
      others: Joi.string().uri().allow('').optional()
    }).optional()
  }).unknown(true)
};

// Booking validation schemas
export const bookingValidation = {
  create: Joi.object({
    user: objectId.required().messages({
      'any.invalid': 'User reference must be a valid ObjectId',
      'any.required': 'User reference is required'
    }),
    vendor: objectId.required().messages({
      'any.invalid': 'Vendor reference must be a valid ObjectId',
      'any.required': 'Vendor reference is required'
    }),
    vendorName: Joi.string().required().messages({
      'string.empty': 'Vendor name is required'
    }),
    eventType: Joi.string().required().messages({
      'string.empty': 'Event type is required'
    }),
    eventDate: Joi.date().iso().required().messages({
      'date.base': 'Please provide a valid event date',
      'any.required': 'Event date is required'
    }),
    eventTime: Joi.string().allow(''),
    venue: Joi.string().allow(''),
    guestCount: Joi.number().integer().min(0).messages({
      'number.base': 'Guest count must be a number',
      'number.min': 'Guest count cannot be negative'
    }),
    plannedAmount: Joi.number().required().min(0).messages({
      'number.base': 'Planned amount must be a number',
      'number.min': 'Planned amount cannot be negative',
      'any.required': 'Planned amount is required'
    }),
    spentAmount: Joi.number().min(0).messages({
      'number.base': 'Spent amount must be a number',
      'number.min': 'Spent amount cannot be negative'
    }),
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').default('pending'),
    notes: Joi.string().allow('')
  })
};

// Inquiry validation schemas
export const inquiryValidation = {
  create: Joi.object({
    vendorId: objectId.required().messages({
      'any.invalid': 'Vendor ID must be a valid ObjectId',
      'any.required': 'Vendor ID is required'
    }),
    userId: objectId.required().messages({
      'any.invalid': 'User ID must be a valid ObjectId',
      'any.required': 'User ID is required'
    }),
    eventDate: Joi.string()
      .pattern(/^\d{2}\/\d{2}\/\d{4}$/)
      .messages({
        'string.pattern.base': 'Event date must be in DD/MM/YYYY format'
      }),
    userMessage: Joi.array().items(
      Joi.object({
        message: Joi.string().min(1).max(1000).required().messages({
          'string.empty': 'Message is required',
          'string.min': 'Message must be at least 1 character',
          'string.max': 'Message cannot exceed 1000 characters'
        }),
        vendorReply: Joi.object({
          message: Joi.string().allow(''),
          createdAt: Joi.date(),
          updatedAt: Joi.date()
        }).optional(),
        date: Joi.date().optional(),
        time: Joi.string().allow('').optional(),
        createdAt: Joi.date().optional(),
        updatedAt: Joi.date().optional()
      })
    ).min(1).required().messages({
      'array.base': 'userMessage must be an array',
      'array.min': 'At least one user message is required'
    }),
    replyStatus: Joi.string().valid('Pending', 'Replied').default('Pending')
  })
};

// Contact form validation schema
export const contactValidation = {
  create: Joi.object({
    name: Joi.string().required().min(3).max(50).messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),
    email: Joi.string().required().email().messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email'
    }),
    phone: Joi.string().required().pattern(/^[0-9]{10}$/).messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be 10 digits'
    }),
    message: Joi.string().required().min(1).max(1000).messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters long',
      'string.max': 'Message cannot exceed 1000 characters'
    })
  })
};

// Review validation schema
export const reviewValidation = {
  create: Joi.object({
    vendorId: Joi.string().required(),
    rating: Joi.number().required().min(1).max(5).messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5'
    }),
    comment: Joi.string().required().min(10).max(500).messages({
      'string.empty': 'Review comment is required',
      'string.min': 'Comment must be at least 10 characters long',
      'string.max': 'Comment cannot exceed 500 characters'
    })
  })
};

// Validation middleware function
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        errors: errors
      });
    }
    
    next();
  };
}; 