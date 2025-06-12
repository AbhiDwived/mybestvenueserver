import express from 'express';
import upload from '../middlewares/upload.js';

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
} from '../controllers/vendorController.js';

import { VerifyVendor, VerifyAdmin ,CheckVendorApproval,} from '../middlewares/authMiddleware.js';

const router = express.Router();

// Register new vendor (with OTP)
router.post('/register', upload.single('profilePicture'), registerVendor);

// Verify vendor OTP
router.post('/vendorverify-otp', verifyVendorOtp);

// Resend OTP to vendor
router.post('/resendvendor-otp', resendVendorOtp);

// Vendor login
router.post('/login', loginVendor);

// Forgot password - send OTP
router.post('/forgot-password', vendorForgotPassword);

// Verify OTP for password reset
router.post('/forgot_password_otp', verifyVendorResetOtp);

// Reset password after OTP verified
router.post('/reset_password', resetVendorPassword);

// Update vendor profile (only authenticated vendors can update their profile)
router.put('/update/:vendorId', VerifyVendor, CheckVendorApproval, upload.single('profilePicture'), updateVendorProfile);


// Delete vendor (only admin can delete vendors for now)
router.delete('/delete/:vendorId', VerifyAdmin, deleteVendor);

export default router;
