import express from 'express';
import upload from '../middlewares/upload.js';
import { uploadToImageKit } from '../middlewares/imageKitUpload.js';

import {
  registerVendor,
  verifyVendorOtp,
  resendVendorOtp,
  loginVendor,
  updateVendorProfile,
  deleteVendor,
  vendorForgotPassword,
  verifyVendorResetOtp,
  resetVendorPassword,
  getVendorById,
  addUserInquiryReply,
  getVendorRepliedInquiryList,
} from '../controllers/vendorController.js';

import { VerifyVendor, VerifyAdmin, CheckVendorApproval } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Register new vendor (with OTP)
router.post('/register', 
  upload.single('profilePicture'),
  (req, res, next) => {
    // Set the folder path for vendor profile pictures
    req.imagePath = '/vendor-profiles';
    next();
  },
  uploadToImageKit,
  registerVendor
);

// Verify vendor OTP
router.post('/vendorverify-otp', verifyVendorOtp);

// Resend OTP
router.post('/resendvendor-otp', resendVendorOtp);

// Login vendor
router.post('/login', loginVendor);

// Forgot password
router.post('/forgot-password', vendorForgotPassword);

// Verify OTP for password reset
router.post('/forgot_password_otp', verifyVendorResetOtp);

// Reset password
router.post('/reset_password', resetVendorPassword);

// Update vendor profile (vendor only)
router.put('/update/:vendorId', 
  VerifyVendor, 
  CheckVendorApproval, 
  upload.single('profilePicture'),
  (req, res, next) => {
    // Set the folder path for vendor profile pictures
    req.imagePath = '/vendor-profiles';
    next();
  },
  uploadToImageKit,
  updateVendorProfile
);

// Delete vendor (only admin can delete vendors for now)
router.delete('/delete/:vendorId', VerifyAdmin, deleteVendor);

// Get vendor by ID
router.get('/vendor/:vendorId', VerifyVendor, getVendorById);

// Handle user inquiry replies
router.post('/inquiry-reply/:vendorId', VerifyVendor, addUserInquiryReply);

// Get vendor's replied inquiries
router.get('/replied-inquiries', VerifyVendor, getVendorRepliedInquiryList);

export default router;
