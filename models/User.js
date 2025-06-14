// server/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
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
      select: false, // Ensure password is not returned by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'vendor'],
      default: 'user',
    },
    address: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    weddingDate: {
      type: Date,
      default: null,
    },
    // OTP-related fields
    otp: {
      type: String,
      select: false, // Don't return OTP in responses
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Export the model
const User = mongoose.model('User', userSchema);

export default User;