import express from 'express';
import mongoose from 'mongoose';
import upload from '../middlewares/upload.js';
import { uploadToImageKit, uploadToStorage } from '../middlewares/imageKitUpload.js';
import { validate, vendorValidation, userValidation } from '../middlewares/validation.js';
import { VerifyVendor, VerifyAdmin, CheckVendorApproval, VerifyAdminOrVendor } from '../middlewares/authMiddleware.js';
import multer from 'multer';

import {
  registerVendor,
  verifyVendorOtp,
  resendVendorOtp,
  loginVendor,
  updateVendorProfile,
  deleteVendor,
  getVendorById,
  addVendorReplyToInquiry,
  
  getVendorRepliedInquiryList,
  addServicesPackage,
  getAllServicesPackages,
  getVendorServicesPackages,
  updateServicePackages,
  deleteServicePackages,
  addFaq,
  getVendorsFaqs,
  updateVendorPricingRange,
  getUserListById,
  createuserBookingByVendor,
  refreshToken,
  uploadPortfolioImage,
  getPortfolioImages,
  deletePortfolioImage,
  uploadPortfolioVideo,
  getPortfolioVideos,
  deletePortfolioVideo,
  resendPasswordResetOtp,
  getlatestVendorTypeData,
  deletePricingList,
  deleteFaq,
  getSimilarVendors,
  VendorsByCity,
  createVendorByAdmin,
  // deletevendorByServicesArea,

  // getCountries,
  // getStates,
  // getCities,
} from '../controllers/vendorController.js';
import { forgotPassword, verifyResetOtp, resetPassword } from '../controllers/authController.js';
import Vendor from '../models/Vendor.js';

const router = express.Router();



// Configure multer for video upload
const videoUpload = multer({
  // Use memory storage for S3/ImageKit uploads
  storage: multer.memoryStorage(),
  
  // Limit file size to 50MB
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  
  // File filter for video types
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, AVI, and MOV are allowed.'), false);
    }
  }
});

// Register a new vendor
router.post('/register',
  validate(vendorValidation.register),
  upload.single('profilePicture'),
  (req, res, next) => {
    // Set the folder path for vendor profile pictures
    req.imagePath = 'vendor-profiles';
    next();
  },
  uploadToStorage, // This will use either S3 or ImageKit based on STORAGE_TYPE
  registerVendor
);

// Verify vendor OTP for registration
router.post('/vendorverify-otp', verifyVendorOtp);

// Resend OTP for vendor registration
router.post('/resendvendor-otp', resendVendorOtp);

// Vendor login
router.post('/login', validate(userValidation.login), loginVendor);

// Request password reset for vendor
router.post('/forgot-password', forgotPassword);

// Verify OTP for password reset
router.post('/forgot_password_otp', verifyResetOtp);

// Resend password reset OTP
router.post('/resend-forgot-password-otp', resendPasswordResetOtp);

// Reset vendor password
router.post('/reset_password', resetPassword);

// Update vendor profile
router.put('/update/:id',
  VerifyAdminOrVendor,
  upload.single('profilePicture'),
  (req, res, next) => {
    req.imagePath = 'vendor-profiles';
    next();
  },
  uploadToStorage,
  updateVendorProfile
);

// Delete a vendor account (Admin only)
router.delete('/delete/:vendorId', VerifyAdmin, deleteVendor);

// Get vendor details by ID
router.get('/vendorbyId/:vendorId', getVendorById);

// Add a vendor's reply to an inquiry
router.post('/inquiry-reply/:vendorId', VerifyAdminOrVendor, addVendorReplyToInquiry);

// Get a list of inquiries a vendor has replied to
router.get('/replied-inquiries/:vendorId', VerifyAdminOrVendor, getVendorRepliedInquiryList);

// Add a new service package for a vendor
router.post('/addservicesPackage', VerifyAdminOrVendor,addServicesPackage);

// Get all service packages for all vendors (Admin)
router.get('/allservicesPackageList', VerifyAdminOrVendor,getAllServicesPackages);

// Get all service packages for a specific vendor
router.get('/vendorservicesPackageList/:vendorId', VerifyAdminOrVendor, getVendorServicesPackages);

// Update a service package
router.put('/updateservicesPackage/:packageId', VerifyAdminOrVendor,updateServicePackages);

// Delete a service package
router.delete('/updateservicesPackage/:packageId', VerifyAdminOrVendor,deleteServicePackages);

// Add a FAQ for a vendor
router.post("/addfaq",VerifyAdminOrVendor,addFaq);

// Get all FAQs for a specific vendor
router.get("/getfaqsbyVendor/:vendorId", VerifyAdminOrVendor, getVendorsFaqs);

// Delete a FAQ for a vendor
router.delete("/deletefaq/:vendorId/:faqId",VerifyAdminOrVendor,deleteFaq);

// Update the pricing range for a vendor
router.put('/pricing-range/:vendorId', VerifyAdminOrVendor, updateVendorPricingRange);

// Get user list by user ID (for vendors)
router.get("/getUserListByUserId/:userId",VerifyAdminOrVendor,getUserListById);

// Create a booking for a user (by vendor)
router.post("/createuserBookingbyVendor",VerifyAdminOrVendor,createuserBookingByVendor);

// Refresh authentication token for vendor
router.post("/refresh-token", refreshToken);



// Portfolio management routes
// Upload a portfolio image
router.post('/portfolio/image',
  VerifyAdminOrVendor,
  upload.single('image'),
  (req, res, next) => {
    req.imagePath = 'vendors/portfolio';
    next();
  },
  uploadToStorage,
  uploadPortfolioImage
);

// Upload a portfolio video
router.post('/portfolio/video', VerifyAdminOrVendor, videoUpload.single('video'), uploadPortfolioVideo);

// Get all portfolio images for a vendor
router.get('/portfolio/images/:vendorId', getPortfolioImages);

// Get all portfolio videos for a vendor
router.get('/portfolio/videos/:vendorId', getPortfolioVideos);

// Delete a portfolio image
router.delete('/portfolio/image/:imageId', VerifyAdminOrVendor, deletePortfolioImage);

// Delete a portfolio video
router.delete('/portfolio/video/:videoId', VerifyAdminOrVendor, deletePortfolioVideo);

// Test route for portfolio
router.get('/portfolio/test', (req, res) => {
  res.json({ message: 'Portfolio routes are working', timestamp: new Date() });
});

// Test route for vendor ID validation
router.get('/test-vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    console.log('🧪 Testing vendor ID:', vendorId);
    
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID format',
        vendorId
      });
    }
    
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
        vendorId
      });
    }
    
    res.json({
      success: true,
      message: 'Vendor found',
      vendorId,
      businessName: vendor.businessName,
      hasPortfolio: !!(vendor.portfolio?.images?.length || vendor.portfolio?.videos?.length)
    });
  } catch (error) {
    console.error('❌ Error testing vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get the latest vendor type data
router.get('/getlatestvendorType', getlatestVendorTypeData);

// Delete a pricing list item for a vendor
router.delete("/:vendorId/pricing/:pricingId", VerifyAdminOrVendor, deletePricingList);

// Get a list of similar vendors
router.get('/getSimilarVendors/:vendorId', VerifyAdminOrVendor, getSimilarVendors);

// Search for vendors by city
router.get("/Vendor/:city", VerifyAdminOrVendor, VendorsByCity);

export default router;
