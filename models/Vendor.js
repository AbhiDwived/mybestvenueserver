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
    profilePicture:{
      type: String,
      default: '',

    },
    status: {
      type: String,
      default: 'Active',
      enum: ['Active', 'InActive'],
      
    },

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    serviceAreas: [String],
    description: String,
    yearsInBusiness: Number,
    licenses: [String],
    pricingRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    websiteURL: String,
    socialMediaLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      others: String,
    },
    profilePicture: String,
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
  },
  { timestamps: true }
);

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
