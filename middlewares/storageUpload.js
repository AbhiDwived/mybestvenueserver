import multer from 'multer';
import { uploadFile } from '../services/storageService.js';

// Configure multer to use memory storage
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
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

/**
 * Helper function to determine image path based on route
 * @param {string} path - The folder path for the image
 * @returns {Function} - Express middleware
 */
export const setImagePath = (path) => (req, res, next) => {
    req.imagePath = path;
    next();
};

/**
 * Middleware to upload file to storage service
 */
export const uploadToStorage = async (req, res, next) => {
    try {
        // If no file was uploaded, continue
        if (!req.file) {
            return next();
        }
        
        const folder = req.imagePath || 'uploads';
        
        // Upload file to storage service
        const result = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            folder
        );
        
        // Add file URL and other info to request object
        req.fileUrl = result.url;
        req.fileInfo = result;
        
        next();
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};