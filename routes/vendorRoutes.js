import express from 'express';
import upload from '../middlewares/upload.js';
import { uploadToImageKit } from '../middlewares/imageKitUpload.js';
import { validate, vendorValidation, userValidation } from '../middlewares/validation.js';
import { VerifyVendor, VerifyAdmin, CheckVendorApproval } from '../middlewares/authMiddleware.js';
import multer from 'multer';

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
  deletePricingList
} from '../controllers/vendorController.js';

const router = express.Router();

// Configure multer for video upload
const videoUpload = multer({
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
router.post('/login', validate(userValidation.login), loginVendor);

// Forgot password
router.post('/forgot-password', vendorForgotPassword);

// Verify OTP for password reset
router.post('/forgot_password_otp', verifyVendorResetOtp);

// Resend password reset OTP
router.post('/resend-forgot-password-otp', resendPasswordResetOtp);

// Reset password
router.post('/reset_password', resetVendorPassword);

// Update vendor profile (vendor only)
router.put('/update/:id', 
  VerifyVendor, 
  CheckVendorApproval, 
  validate(vendorValidation.updateProfile),
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
router.get('/vendorbyId/:vendorId', getVendorById);

// Handle user inquiry replies
router.post('/inquiry-reply/:vendorId', VerifyVendor, addUserInquiryReply);

// Get vendor's replied inquiries
router.get('/replied-inquiries', VerifyVendor, getVendorRepliedInquiryList);


// Packages routes
router.post('/addservicesPackage', VerifyVendor,addServicesPackage);
router.get('/allservicesPackageList', VerifyVendor,getAllServicesPackages);
router.get('/vendorservicesPackageList/:vendorId',getVendorServicesPackages);
router.put('/updateservicesPackage/:packageId', VerifyVendor,updateServicePackages);
router.delete('/updateservicesPackage/:packageId', VerifyVendor,deleteServicePackages);

// Faqs routes
router.post("/addfaq",VerifyVendor,addFaq);
router.get("/getfaqsbyVendor/:vendorId",VerifyVendor,getVendorsFaqs);

// Update vendor pricing range
router.put('/pricing-range/:vendorId', VerifyVendor, updateVendorPricingRange);

// get UserListBy userId 
router.get("/getUserListByUserId/:userId",VerifyVendor,getUserListById);

// create userBooking By vendor

router.post("/createuserBookingbyVendor",VerifyVendor,createuserBookingByVendor);

router.post("/refresh-token", refreshToken);

// Portfolio management routes
// Upload portfolio image (vendor only)
router.post('/portfolio/image',
  VerifyVendor,
  CheckVendorApproval,
  upload.single('image'),
  (req, res, next) => {
    req.imagePath = '/vendors/portfolio';
    next();
  },
  uploadToImageKit,
  uploadPortfolioImage
);

// Get vendor portfolio images (public)
router.get('/portfolio/images/:vendorId', getPortfolioImages);

// Delete portfolio image (vendor only)
router.delete('/portfolio/image/:imageId', VerifyVendor, CheckVendorApproval, deletePortfolioImage);

// Upload portfolio video info (vendor only)
router.post('/portfolio/video', VerifyVendor, CheckVendorApproval, videoUpload.single('video'), uploadPortfolioVideo);

// Get vendor portfolio videos (public)
router.get('/portfolio/videos/:vendorId', getPortfolioVideos);

// Delete portfolio video (vendor only)
router.delete('/portfolio/video/:videoId', VerifyVendor, CheckVendorApproval, deletePortfolioVideo);

// get latest vendorType record
router.get('/getlatestvendorType',getlatestVendorTypeData );


// get latest vendorType record
router.get('/getlatestvendorType',getlatestVendorTypeData );
router.delete("/:vendorId/pricing/:pricingId",VerifyVendor,deletePricingList);

export default router;
