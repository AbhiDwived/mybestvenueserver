import express from 'express';
import upload from '../middlewares/upload.js';
import { uploadToStorage } from '../middlewares/imageKitUpload.js';
import { VerifyVendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Upload image for rich text editor (vendor only)
//  Only vendors can upload images for the blog editor; image is stored in 'blogs/editor' folder
router.post('/image', 
  VerifyVendor,
  upload.single('image'),
  (req, res, next) => {
    //  Set the folder path for editor images
    req.imagePath = 'blogs/editor';
    next();
  },
  uploadToStorage,
  (req, res) => {
    try {
      if (!req.file) {
        //  Return error if no image file was provided in the request
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      //  Return the uploaded image URL (from S3/ImageKit or local fallback)
      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        url: req.file.location || req.imageUrl || req.fileUrl || `/uploads/blogs/editor/${req.file.filename}`
      });
    } catch (error) {
      //  Handle and return any upload errors
      res.status(500).json({
        success: false,
        message: 'Error uploading image',
        error: error.message
      });
    }
  }
);

// Upload profile picture (any user)
//  Upload a profile picture, store in 'profiles' folder, and return the image URL
router.post('/profile-picture', 
  upload.single('profilePicture'),
  (req, res, next) => {
    //  Set the folder path for profile pictures
    req.imagePath = 'profiles';
    next();
  },
  uploadToStorage,
  (req, res) => {
    try {
      if (!req.file) {
        //  Return error if no profile picture was provided
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      //  Return the uploaded profile picture URL (from S3/ImageKit or local fallback)
      res.status(200).json({
        success: true,
        message: 'Profile picture uploaded successfully',
        url: req.imageUrl || req.fileUrl
      });
    } catch (error) {
      //  Handle and return any upload errors
      res.status(500).json({
        success: false,
        message: 'Error uploading profile picture',
        error: error.message
      });
    }
  }
);

export default router;