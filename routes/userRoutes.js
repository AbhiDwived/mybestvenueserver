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
  // sendUserInquiry,
  updateUserInquiry,
  getUserInquiryList,

  addUserInquiryMessage,
  updatePassword,
  submitContactForm,
  getAllMessage,
} from '../controllers/userController.js';

import upload from "../middlewares/upload.js";
import { VerifyUser } from "../middlewares/authMiddleware.js";

const router = express.Router();


// Register route with file upload
router.post("/register", upload.single('profilePhoto'), register);

router.post('/verify-otp', verifyOtp);

router.post('/resend-otp', resendOtp);

// Login route
router.post('/login', login);

// Forgot Password with OTP
router.post('/forgot_password', forgotPassword);
router.post('/verify_password_reset', verifyPasswordReset);
router.post('/reset_password', resetPassword);

// Update user profile route (should accept userId as a URL parameter)
router.put(
  "/update-profile/:userId",
  VerifyUser,
  upload.single('profilePhoto'),
  updateProfile
);

// Delete user route (should accept userId as a URL parameter)
router.delete('/delete/:userId', VerifyUser, deleteUser);

// Wishlist functionality (protected)
router.post('/wishlist/:venueId', VerifyUser, addToWishlist);
router.delete('/wishlist/:venueId', VerifyUser, removeFromWishlist);
router.get('/wishlist', VerifyUser, getWishlist);

router.post('/logout', logout);

// ############### user inquiry route ####################

// router.post('/senduser_inquiry', VerifyUser,sendUserInquiry);
router.put('/updateuser_inquiry/:inquiryId', VerifyUser,updateUserInquiry);
router.post('/getuser_inquiryList', VerifyUser,getUserInquiryList);

// ########### reply route #######################
router.post('/userInquiryMessage/:userId', VerifyUser,addUserInquiryMessage);

router.put('/update-password/:userId', updatePassword);

//post
router.post("/contact", submitContactForm); 

//get
router.get("/contacts", getAllMessage); 
export default router;
