import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
    },
    vendorType: {
      type: String,
      required: [true, 'Vendor type is required'],
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'Active',
      enum: ['Active', 'InActive'],
    },
    address: {
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      street: String,
      country: String,
      zipCode: String,
    },
    services: [String],
    serviceAreas: [String],
    description: String,
    yearsInBusiness: Number,
    licenses: [String],
    pricing: [
      {
        type: {
          type: String,
          required: true,

        },
        price: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          default: 'INR',
        },
        unit: {
          type: String,
          default: 'per person'
        }
      },
    ],

    websiteURL: String,
    socialMediaLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      others: String,
    },
    galleryImages: [
      {
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    paymentMethods: [String],
    depositInfo: String,
    packagePrices: [
      {
        name: String,
        price: Number,
        description: String,
      },
    ],
    termsAccepted: {
      type: Boolean,
      required: true,
    },
    role: {
      type: String,
      default: 'vendor',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    // OTP-related fields
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Reset Password OTP-related fields
    resetPasswordOtp: {
      type: String,
      select: false,
    },
    resetPasswordOtpExpires: {
      type: Date,
      select: false,
    },
    // Add the portfolio schema to the vendor model
    portfolio: {
      images: [
        {
          url: String,
          title: {
            type: String,
            default: 'Portfolio Image'
          },
          description: String,
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      videos: [
        {
          url: String,
          title: {
            type: String,
            default: 'Portfolio Video'
          },
          description: String,
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ]
    },
  },
  { timestamps: true }
);

// Remove duplicate profilePicture field
vendorSchema.pre('save', function (next) {
  if (this.isModified('profilePicture') && this.profilePicture && this.profilePicture.startsWith('http')) {
    // If the profile picture is a URL (from ImageKit), ensure it's properly formatted
    this.profilePicture = this.profilePicture.trim();
  }
  next();
});

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
