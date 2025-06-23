// Validation middleware
import Joi from 'joi';

// User validation schemas
export const userValidation = {
  register: Joi.object({
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
    password: Joi.string().required().min(6).messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long'
    })
  }),
  login: Joi.object({
    email: Joi.string().required().email().messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required'
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
    businessName: Joi.string().min(3).max(100),
    contactName: Joi.string().min(3).max(50),
    phone: Joi.string().pattern(/^[0-9]{10}$/),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      zipCode: Joi.string()
    }),
    serviceAreas: Joi.array().items(Joi.string()),
    description: Joi.string().max(1000),
    profilePicture: Joi.string().uri().allow(''),
    status: Joi.string().valid('Active', 'InActive'),
    socialMediaLinks: Joi.object({
      facebook: Joi.string().uri().allow(''),
      instagram: Joi.string().uri().allow(''),
      twitter: Joi.string().uri().allow(''),
      linkedin: Joi.string().uri().allow(''),
      others: Joi.string().uri().allow('')
    })
  })
};

// Booking validation schemas
export const bookingValidation = {
  create: Joi.object({
    vendorId: Joi.string().required().messages({
      'string.empty': 'Vendor ID is required'
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
    eventTime: Joi.string(),
    venue: Joi.string(),
    guestCount: Joi.number().integer().min(0),
    plannedAmount: Joi.number().required().min(0).messages({
      'number.base': 'Planned amount must be a number',
      'number.min': 'Planned amount cannot be negative'
    }),
    spentAmount: Joi.number().min(0),
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled'),
    notes: Joi.string()
  })
};

// Inquiry validation schemas
export const inquiryValidation = {
  create: Joi.object({
    vendorId: Joi.string().required().messages({
      'string.empty': 'Vendor ID is required'
    }),
    weddingDate: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).messages({
      'string.pattern.base': 'Wedding date must be in DD/MM/YYYY format'
    }),
    userMessage: Joi.array().items(
      Joi.object({
        message: Joi.string().required().min(10).max(1000).messages({
          'string.empty': 'Message is required',
          'string.min': 'Message must be at least 10 characters long',
          'string.max': 'Message cannot exceed 1000 characters'
        }),
        vendorReply: Joi.object({
          message: Joi.string(),
          createdAt: Joi.date(),
          updatedAt: Joi.date()
        }),
        date: Joi.date(),
        time: Joi.string()
      })
    ),
    replyStatus: Joi.string().valid('Pending', 'Replied')
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
    message: Joi.string().required().min(10).max(1000).messages({
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