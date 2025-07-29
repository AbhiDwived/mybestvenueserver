import express from 'express';
import upload from '../middlewares/upload.js';
import { uploadToStorage } from '../middlewares/imageKitUpload.js';
import { VerifyVendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Upload image for rich text editor
router.post('/image', 
  VerifyVendor,
  upload.single('image'),
  (req, res, next) => {
    // Set the folder path for editor images
    req.imagePath = 'blogs/editor';
    next();
  },
  uploadToStorage,
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // Return the image URL
      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        url: req.file.location || `/uploads/blogs/editor/${req.file.filename}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading image',
        error: error.message
      });
    }
  }
);

export default router;