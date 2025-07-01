import multer from 'multer';
import path from 'path';
import fs from 'fs';
import imagekit from '../config/imagekit.js';

// Configure multer to use memory storage for ImageKit
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

// Configure upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
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
