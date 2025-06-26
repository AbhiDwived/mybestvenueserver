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
import { uploadToImageKit, setImagePath } from "../middlewares/upload.js";
import { VerifyUser } from "../middlewares/authMiddleware.js";
import { validate, userValidation, contactValidation } from '../middlewares/validation.js';
import { verifyToken } from "../middlewares/authMiddleware.js";
import { verifyRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Register route with ImageKit upload
router.post(
  "/register",
  validate(userValidation.register),
  upload.single("profilePhoto"),
  setImagePath("/users"), // Set the folder path for user uploads
  uploadToImageKit,
  register
);

router.post("/verify-otp", verifyOtp);

router.post("/resend-otp", resendOtp);

// Login route
router.post("/login", validate(userValidation.login), login);

// Forgot Password with OTP
router.post("/forgot_password", forgotPassword);
router.post("/verify_password_reset", verifyPasswordReset);
router.post("/reset_password", resetPassword);

router.get("/UserProfile",VerifyUser, getUserProfile);

// Update profile route with ImageKit upload
router.put(
  "/update-profile/:userId",
  VerifyUser,
  validate(userValidation.updateProfile),
  upload.single("profilePhoto"),
  setImagePath("/users"),
  uploadToImageKit,
  updateProfile
);

// Delete user route (should accept userId as a URL parameter)
router.delete("/delete/:userId", VerifyUser, deleteUser);

// Wishlist functionality (protected)
router.post("/wishlist/:venueId", VerifyUser, addToWishlist);
router.delete("/wishlist/:venueId", VerifyUser, removeFromWishlist);
router.get("/wishlist", VerifyUser, getWishlist);

router.post("/logout", logout);

// ############### user inquiry route ####################

// router.post('/senduser_inquiry', VerifyUser,sendUserInquiry);
router.put("/updateuser_inquiry/:inquiryId", VerifyUser, updateUserInquiry);
router.post("/getuser_inquiryList", VerifyUser, getUserInquiryList);

// ########### reply route #######################
router.post("/userInquiryMessage",  addUserInquiryMessage);

router.put("/update-password/:userId", updatePassword);

//post
router.post("/contact", validate(contactValidation.create), submitContactForm);

//get
router.get("/contacts", getAllMessage);

router.post("/refresh-token", refreshToken);

// Get user profile by ID (protected route, only for vendors and admins)
router.get("/profile/:userId", getUserProfileById);

export default router;
