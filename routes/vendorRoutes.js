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
import { forgotPassword, verifyResetOtp, resetPassword, resendPasswordResetOtp } from '../controllers/authController.js';
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
  upload.any(),
  (req, res, next) => {
    req.imagePath = 'vendor-profiles';
    console.log('📋 Route: Files received:', req.files ? req.files.map(f => f.fieldname) : 'none');
    
    // Handle the main profile picture file
    if (req.files) {
      const profilePicFile = req.files.find(file => file.fieldname === 'profilePicture');
      if (profilePicFile) {
        req.file = profilePicFile;
      }
      
      // Group space images
      const spaceImages = req.files.filter(file => file.fieldname === 'spaceImages');
      if (spaceImages.length > 0) {
        req.files.spaceImages = spaceImages;
        console.log('🏢 Route: Found', spaceImages.length, 'space images');
      }
    }
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

// Get all service packages for a specific vendor (public endpoint)
router.get('/vendorservicesPackageList/:vendorId', getVendorServicesPackages);

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

// Get a list of similar vendors (public endpoint)
router.get('/getSimilarVendors/:vendorId', getSimilarVendors);

// Search for vendors by city
router.get("/Vendor/:city", VerifyAdminOrVendor, VendorsByCity);

// SEO-friendly vendor URL (venue-only variant; must be before the generic one)
router.get('/location/:city/:type/:slug', async (req, res) => {
  try {
    const { city, type, slug } = req.params;
    const businessType = 'venue'; // Hardcoded for this route
    
    // Enhanced slug parsing with better handling
    const inIndex = slug.lastIndexOf('-in-');
    let businessName = inIndex > -1 ? slug.substring(0, inIndex).replace(/-/g, ' ') : slug.replace(/-/g, ' ');
    let nearLocation = inIndex > -1 ? slug.substring(inIndex + 4).replace(/-/g, ' ') : '';
    
    // Normalize and trim
    businessName = businessName.replace(/\s+/g, ' ').trim();
    nearLocation = nearLocation.replace(/\s+/g, ' ').trim();
    
    console.log('Parsed SEO URL values:', { city, businessType, type, businessName, nearLocation });

    // Build precise search query
    const searchQuery = {
      businessType: businessType,
      isVerified: true,
      isApproved: true
    };

    const cityName = city.replace(/-/g, ' ');
    searchQuery.$or = [
      { city: { $regex: cityName, $options: 'i' } },
      { city: { $in: [new RegExp(cityName, 'i')] } }
    ];

    if (businessName) {
      searchQuery.businessName = { $regex: `^${businessName}$`, $options: 'i' };
    }

    searchQuery.venueType = { $regex: type.replace(/-/g, ' '), $options: 'i' };

    if (nearLocation) {
      searchQuery.$and = [{
        $or: [
          { nearLocation: { $regex: `^${nearLocation}$`, $options: 'i' } },
          { address: { $regex: nearLocation, $options: 'i' } }
        ]
      }];
    }

    console.log('Precise search query:', JSON.stringify(searchQuery, null, 2));

    let vendor = await Vendor.findOne(searchQuery);

    if (!vendor) {
      console.log('No exact match found, trying partial business name match...');
      const partialQuery = {
        businessType: businessType,
        isVerified: true,
        isApproved: true,
        $or: [
          { city: { $regex: cityName, $options: 'i' } },
          { city: { $in: [new RegExp(cityName, 'i')] } }
        ],
        venueType: { $regex: type.replace(/-/g, ' '), $options: 'i' }
      };

      if (businessName) {
        const businessNameWords = businessName.split(' ').filter(word => word.length > 2);
        if (businessNameWords.length > 0) {
          const nameRegex = businessNameWords.map(word => `(?=.*${word})`).join('');
          partialQuery.businessName = { $regex: nameRegex, $options: 'i' };
        } else {
          partialQuery.businessName = { $regex: businessName, $options: 'i' };
        }
      }

      if (nearLocation) {
        partialQuery.$and = [{
          $or: [
            { nearLocation: { $regex: nearLocation, $options: 'i' } },
            { address: { $regex: nearLocation, $options: 'i' } }
          ]
        }];
      }

      vendor = await Vendor.findOne(partialQuery);
    }

    if (!vendor) {
      console.log('No partial match found, trying broader search...');
      const broadQuery = {
        businessType: businessType,
        isVerified: true,
        isApproved: true,
        $or: [
          { city: { $regex: cityName.split(' ')[0], $options: 'i' } },
          { city: { $in: [new RegExp(cityName.split(' ')[0], 'i')] } }
        ],
        venueType: { $regex: type.replace(/-/g, ' '), $options: 'i' }
      };

      if (businessName) {
        const firstWord = businessName.split(' ')[0];
        if (firstWord.length > 2) {
          broadQuery.businessName = { $regex: firstWord, $options: 'i' };
        }
      }

      if (nearLocation) {
        broadQuery.$or.push({ nearLocation: { $regex: nearLocation.split(' ')[0], $options: 'i' } });
      }

      vendor = await Vendor.findOne(broadQuery);
    }

    if (!vendor) {
      const similarVendors = await Vendor.find({
        businessType: businessType,
        isVerified: true,
        isApproved: true,
        $or: [
          { city: { $regex: cityName.split(' ')[0], $options: 'i' } },
          { venueType: { $regex: type.replace(/-/g, ' '), $options: 'i' } }
        ]
      }).limit(5);

      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found',
        suggestions: similarVendors.map(v => ({
          id: v._id,
          businessName: v.businessName,
          city: v.city,
          venueType: v.venueType || v.vendorType,
          seoUrl: `/${v.city?.toLowerCase().replace(/\s+/g, '-')}/${businessType}/${(v.venueType || v.vendorType)?.toLowerCase().replace(/\s+/g, '-')}/${v.businessName?.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-in-${v.nearLocation?.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-') || 'area'}`
        }))
      });
    }

    res.json({ success: true, vendor });
  } catch (error) {
    console.error('SEO URL error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Generic SEO URL (supports both vendor and venue)
router.get('/:businessType/:city/:type/:slug', async (req, res) => {
  try {
    const { businessType, city, type, slug } = req.params;
    
    // Enhanced slug parsing with better handling
    const inIndex = slug.lastIndexOf('-in-');
    let businessName = inIndex > -1 ? slug.substring(0, inIndex).replace(/-/g, ' ') : slug.replace(/-/g, ' ');
    let nearLocation = inIndex > -1 ? slug.substring(inIndex + 4).replace(/-/g, ' ') : '';
    
    // Normalize and trim
    businessName = businessName.replace(/\s+/g, ' ').trim();
    nearLocation = nearLocation.replace(/\s+/g, ' ').trim();
    
    console.log('Parsed SEO URL values:', { city, businessType, type, businessName, nearLocation });
    
    // Build more precise search query
    const searchQuery = {
      businessType: businessType,
      isVerified: true,
      isApproved: true
    };

    // Add city matching - be more specific
    const cityName = city.replace(/-/g, ' ');
    searchQuery.$or = [
      { city: { $regex: cityName, $options: 'i' } },
      { city: { $in: [new RegExp(cityName, 'i')] } }
    ];

    // Add more precise business name matching
    if (businessName) {
      // Try exact match first
      searchQuery.businessName = { $regex: `^${businessName}$`, $options: 'i' };
    }

    // Add type matching
    if (businessType === 'vendor') {
      searchQuery.vendorType = { $regex: type.replace(/-/g, ' '), $options: 'i' };
    } else {
      searchQuery.venueType = { $regex: type.replace(/-/g, ' '), $options: 'i' };
    }

    // If nearLocation is present in slug, require it to match as well
    if (nearLocation) {
      searchQuery.$and = [{
        $or: [
          { nearLocation: { $regex: `^${nearLocation}$`, $options: 'i' } },
          { address: { $regex: nearLocation, $options: 'i' } }
        ]
      }];
    }
    
    console.log('Precise search query:', JSON.stringify(searchQuery, null, 2));
    
    // Try exact match first
    let vendor = await Vendor.findOne(searchQuery);

    // If no exact match, try partial business name match, honoring nearLocation
    if (!vendor) {
      console.log('No exact match found, trying partial business name match...');
      
      const partialQuery = {
        businessType: businessType,
        isVerified: true,
        isApproved: true,
        $or: [
          { city: { $regex: cityName, $options: 'i' } },
          { city: { $in: [new RegExp(cityName, 'i')] } }
        ]
      };

      // Try to match business name more precisely
      if (businessName) {
        // Split business name into words and try to match each word
        const businessNameWords = businessName.split(' ').filter(word => word.length > 2);
        if (businessNameWords.length > 0) {
          const nameRegex = businessNameWords.map(word => `(?=.*${word})`).join('');
          partialQuery.businessName = { $regex: nameRegex, $options: 'i' };
        } else {
          partialQuery.businessName = { $regex: businessName, $options: 'i' };
        }
      }

      if (businessType === 'vendor') {
        partialQuery.vendorType = { $regex: type.replace(/-/g, ' '), $options: 'i' };
      } else {
        partialQuery.venueType = { $regex: type.replace(/-/g, ' '), $options: 'i' };
      }

      if (nearLocation) {
        partialQuery.$and = [{
          $or: [
            { nearLocation: { $regex: nearLocation, $options: 'i' } },
            { address: { $regex: nearLocation, $options: 'i' } }
          ]
        }];
      }

      vendor = await Vendor.findOne(partialQuery);
    }

    // If still no match, try broader search but with better ranking, prefer nearLocation
    if (!vendor) {
      console.log('No partial match found, trying broader search...');
      
      const broadQuery = {
        businessType: businessType,
        isVerified: true,
        isApproved: true,
        $or: [
          { city: { $regex: cityName.split(' ')[0], $options: 'i' } },
          { city: { $in: [new RegExp(cityName.split(' ')[0], 'i')] } }
        ]
      };

      if (businessName) {
        // Try to match at least the first word of business name
        const firstWord = businessName.split(' ')[0];
        if (firstWord.length > 2) {
          broadQuery.businessName = { $regex: firstWord, $options: 'i' };
        }
      }

      if (businessType === 'vendor') {
        broadQuery.vendorType = { $regex: type.replace(/-/g, ' '), $options: 'i' };
      } else {
        broadQuery.venueType = { $regex: type.replace(/-/g, ' '), $options: 'i' };
      }

      if (nearLocation) {
        broadQuery.$or.push({ nearLocation: { $regex: nearLocation.split(' ')[0], $options: 'i' } });
      }

      vendor = await Vendor.findOne(broadQuery);
    }

    if (!vendor) {
      // Find similar vendors for suggestions
      const similarVendors = await Vendor.find({
        businessType: businessType,
        isVerified: true,
        isApproved: true,
        $or: [
          { city: { $regex: cityName.split(' ')[0], $options: 'i' } },
          { venueType: { $regex: type.replace(/-/g, ' '), $options: 'i' } }
        ]
      }).limit(5);

      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found',
        suggestions: similarVendors.map(v => ({
          id: v._id,
          businessName: v.businessName,
          city: v.city,
          venueType: v.venueType || v.vendorType,
          seoUrl: `/${v.city?.toLowerCase().replace(/\s+/g, '-')}/${businessType}/${(v.venueType || v.vendorType)?.toLowerCase().replace(/\s+/g, '-')}/${v.businessName?.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-in-${v.nearLocation?.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-') || 'area'}`
        }))
      });
    }
    
    res.json({ success: true, vendor });
  } catch (error) {
    console.error('SEO URL error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
