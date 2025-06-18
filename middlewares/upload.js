import multer from 'multer';
import path from 'path';
import fs from 'fs';
import imagekit from '../config/imagekit.js';

// Set storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the upload directory based on the route
    let uploadDir = 'uploads/';
    
    if (req.originalUrl.includes('/blogs')) {
      uploadDir += 'blogs/';
    } else if (req.originalUrl.includes('/vendor')) {
      uploadDir += 'vendors/';
    } else if (req.originalUrl.includes('/user')) {
      uploadDir += 'users/';
    } else if (req.originalUrl.includes('/admin')) {
      uploadDir += 'admin/';
    }

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }

    // Create specific directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, .webp files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// ImageKit upload middleware
export const uploadToImageKit = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        // Convert buffer to base64
        const fileStr = req.file.buffer.toString('base64');

        // Upload to ImageKit
        const response = await imagekit.upload({
            file: fileStr,
            fileName: `${Date.now()}-${req.file.originalname}`,
            folder: req.imagePath || '/uploads' // Default folder if not specified
        });

        // Add ImageKit URL to request object
        req.fileUrl = response.url;
        next();
    } catch (error) {
        console.error('ImageKit Upload Error:', error);
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};

// Helper function to determine image path based on route
export const setImagePath = (path) => (req, res, next) => {
    req.imagePath = path;
    next();
};

export default upload;
