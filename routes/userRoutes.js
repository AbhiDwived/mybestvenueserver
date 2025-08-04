import express from "express";
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
  resendPasswordResetOtp,
  logout,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  // sendUserInquiry,
  updateUserInquiry,
  getUserInquiryList,

  //getUserProfile
  getUserProfile,
  addUserInquiryMessage,
  updatePassword,
  submitContactForm,
  getAllMessage,
  refreshToken,
  getUserProfileById,
} from "../controllers/userController.js";

import upload from "../middlewares/upload.js";
import { uploadToImageKit, uploadToStorage, setImagePath } from "../middlewares/upload.js";
import { VerifyUser } from "../middlewares/authMiddleware.js";
import { validate, userValidation, contactValidation } from '../middlewares/validation.js';
import { verifyToken } from "../middlewares/authMiddleware.js";
import { verifyRole } from "../middlewares/roleMiddleware.js";
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User registration
router.post(
  "/register",
  validate(userValidation.register),
  upload.single("profilePhoto"),
  setImagePath("users"), // Set the folder path for user uploads
  uploadToStorage, // This will use either S3 or ImageKit based on STORAGE_TYPE
  register
);

// Verify OTP for user registration
router.post("/verify-otp", verifyOtp);

// Resend OTP for user registration
router.post("/resend-otp", resendOtp);

// User login
router.post("/login", validate(userValidation.login), login);

// Forgot password
router.post("/forgot_password", forgotPassword);

// Verify password reset OTP
router.post("/verify_password_reset", verifyPasswordReset);

// Reset password
router.post("/reset_password", resetPassword);

// Resend password reset OTP
router.post("/resend-password-reset-otp", resendPasswordResetOtp);

// Get user profile
router.get("/UserProfile",VerifyUser, getUserProfile);

// Update user profile
router.put(
  "/update-profile/:userId",
  VerifyUser,
  validate(userValidation.updateProfile),
  upload.single("profilePhoto"),
  setImagePath("users"),
  uploadToStorage, // This will use either S3 or ImageKit based on STORAGE_TYPE
  updateProfile
);

// Delete user account
router.delete("/delete/:userId", VerifyUser, deleteUser);

// Add venue to wishlist
router.post("/wishlist/:venueId", VerifyUser, addToWishlist);

// Remove venue from wishlist
router.delete("/wishlist/:venueId", VerifyUser, removeFromWishlist);

// Get user's wishlist
router.get("/wishlist", VerifyUser, getWishlist);

// User logout
router.post("/logout", logout);

// Update user inquiry
router.put("/updateuser_inquiry/:inquiryId", VerifyUser, updateUserInquiry);

// Get user inquiry list
router.post("/getuser_inquiryList", VerifyUser, getUserInquiryList);

// Add a message to a user inquiry
router.post("/userInquiryMessage/:userId",  addUserInquiryMessage);

// Update user password
router.put("/update-password/:userId", updatePassword);

// Submit contact form
router.post("/contact", validate(contactValidation.create), submitContactForm);

// Get all contact messages
router.get("/contacts", getAllMessage);

// Refresh authentication token
router.post("/refresh-token", refreshToken);

// Get user profile by ID (for vendors and admins)
router.get("/profile/:userId", getUserProfileById);

// Test token validity
router.get("/check-token", protect, (req, res) => {
  res.status(200).json({
    message: "Token is valid",
    user: req.user,
    tokenExpiry: req.user.exp,
    currentTime: Math.floor(Date.now() / 1000)
  });
});

export default router;
