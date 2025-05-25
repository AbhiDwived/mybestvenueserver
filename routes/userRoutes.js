import express from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  updateProfile,
  deleteUser,
  forgotPassword,
  verifyPasswordReset,
  resetPassword,
  logout,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from '../controllers/userController.js';

import { VerifyUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Register route
router.post('/register', register);

router.post('/verify-otp', verifyOtp);

router.post('/resend-otp', resendOtp);

// Login route
router.post('/login', login);

// Forgot Password with OTP
router.post('/forgot_password', forgotPassword);
router.post('/verify_password_reset', verifyPasswordReset);
router.post('/reset_password', resetPassword);

// Update user profile route (should accept userId as a URL parameter)
router.put('/update-profile/:userId', VerifyUser, updateProfile);

// Delete user route (should accept userId as a URL parameter)
router.delete('/delete/:userId', VerifyUser, deleteUser);

// Wishlist functionality (protected)
router.post('/wishlist/:venueId', VerifyUser, addToWishlist);
router.delete('/wishlist/:venueId', VerifyUser, removeFromWishlist);
router.get('/wishlist', VerifyUser, getWishlist);

router.post('/logout', logout);

export default router;
