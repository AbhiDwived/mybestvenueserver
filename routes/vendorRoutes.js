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

// Register new vendor (with OTP)
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

// Verify vendor OTP
router.post('/vendorverify-otp', verifyVendorOtp);

// Resend OTP
router.post('/resendvendor-otp', resendVendorOtp);

// Login vendor
router.post('/login', validate(userValidation.login), loginVendor);

// Forgot password
router.post('/forgot-password', forgotPassword);

// Verify OTP for password reset
router.post('/forgot_password_otp', verifyResetOtp);

// Resend password reset OTP
router.post('/resend-forgot-password-otp', resendPasswordResetOtp);

// Reset password
router.post('/reset_password', resetPassword);

// Update vendor profile (vendor or admin)
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

// Delete vendor (only admin can delete vendors for now)
router.delete('/delete/:vendorId', VerifyAdmin, deleteVendor);

// Get vendor by ID (Overview)
router.get('/vendorbyId/:vendorId', getVendorById);

// Handle user inquiry replies

router.post('/inquiry-reply/:vendorId', VerifyAdminOrVendor, addVendorReplyToInquiry);

// Get vendor's replied inquiries
router.get('/replied-inquiries/:vendorId', VerifyAdminOrVendor, getVendorRepliedInquiryList);


// Packages routes
router.post('/addservicesPackage', VerifyAdminOrVendor,addServicesPackage);
router.get('/allservicesPackageList', VerifyAdminOrVendor,getAllServicesPackages);
router.get('/vendorservicesPackageList/:vendorId', VerifyAdminOrVendor, getVendorServicesPackages);
router.put('/updateservicesPackage/:packageId', VerifyAdminOrVendor,updateServicePackages);
router.delete('/updateservicesPackage/:packageId', VerifyAdminOrVendor,deleteServicePackages);

// Faqs routes
router.post("/addfaq",VerifyAdminOrVendor,addFaq);
router.get("/getfaqsbyVendor/:vendorId", VerifyAdminOrVendor, getVendorsFaqs);
router.delete("/deletefaq/:vendorId/:faqId",VerifyAdminOrVendor,deleteFaq);

// Update vendor pricing range
router.put('/pricing-range/:vendorId', VerifyAdminOrVendor, updateVendorPricingRange);

// get UserListBy userId 
router.get("/getUserListByUserId/:userId",VerifyAdminOrVendor,getUserListById);

// create userBooking By vendor
router.post("/createuserBookingbyVendor",VerifyAdminOrVendor,createuserBookingByVendor);

router.post("/refresh-token", refreshToken);



// Portfolio management routes
// Upload portfolio image (vendor or admin)
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

// Upload portfolio video (vendor or admin)
router.post('/portfolio/video', VerifyAdminOrVendor, videoUpload.single('video'), uploadPortfolioVideo);

// Get vendor portfolio images (public - no auth required)
router.get('/portfolio/images/:vendorId', getPortfolioImages);

// Get vendor portfolio videos (public - no auth required)
router.get('/portfolio/videos/:vendorId', getPortfolioVideos);

// Delete portfolio image (vendor or admin)
router.delete('/portfolio/image/:imageId', VerifyAdminOrVendor, deletePortfolioImage);

// Delete portfolio video (vendor or admin)
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

// get latest vendorType record (public endpoint)
router.get('/getlatestvendorType', getlatestVendorTypeData);

// delete pricing list
router.delete("/:vendorId/pricing/:pricingId", VerifyAdminOrVendor, deletePricingList);

// get Similar Vendors List 
router.get('/getSimilarVendors/:vendorId', VerifyAdminOrVendor, getSimilarVendors);

// vendor city wise search 
router.get("/Vendor/:city", VerifyAdminOrVendor, VendorsByCity);

export default router;
