import multer from 'multer';
import { uploadFile } from '../services/storageService.js';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    //  Only accept files with MIME type starting with 'image/'
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

// Configure upload middleware
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 //  5MB file size limit
    }
});

// Set image path middleware
export const setImagePath = (path) => (req, res, next) => {
    //  Attach the desired image folder path to the request for downstream use
    req.imagePath = path;
    next();
};

// Middleware to upload file to storage service
export const uploadToStorage = async (req, res, next) => {
    try {
        //  If no file was uploaded, skip upload and continue
        if (!req.file) {
            return next();
        }
        
        //  Use provided imagePath or default to 'uploads'
        const folder = req.imagePath || 'uploads';
        
        //  Upload file buffer to storage service (S3, ImageKit, etc.)
        const result = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            folder
        );
        
        //  Attach file URL and info to request for downstream use
        req.fileUrl = result.url;
        req.fileInfo = result;
        
        next();
    } catch (error) {
        //  Handle upload errors and return 500 response
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};