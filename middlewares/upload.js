import multer from 'multer';
import path from 'path';
import fs from 'fs';
import imagekit from '../config/imagekit.js';

// Configure multer to use disk storage temporarily
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/temp';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to allow only images with size validation
const fileFilter = (req, file, cb) => {
    // Check file type
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
    }

    // Get file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (!allowedExts.includes(ext)) {
        return cb(new Error('Invalid file type! Only jpg, jpeg, png, gif, and webp are allowed.'), false);
    }

    cb(null, true);
};

// Configure upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only 1 file at a time
    }
});

// Cleanup temporary files
const cleanupTemp = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error cleaning up temp file:', error);
    }
};

// ImageKit upload middleware with error handling and cleanup
export const uploadToImageKit = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        // Read file from disk
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileStr = fileBuffer.toString('base64');

        // Upload to ImageKit with timeout
        const uploadPromise = imagekit.upload({
            file: fileStr,
            fileName: `${Date.now()}-${path.basename(req.file.originalname, path.extname(req.file.originalname))}`,
            folder: req.imagePath || '/uploads'
        });

        // Set timeout for upload
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout')), 30000); // 30 seconds timeout
        });

        // Race between upload and timeout
        const response = await Promise.race([uploadPromise, timeoutPromise]);

        // Add ImageKit URL to request object
        req.fileUrl = response.url;

        // Cleanup temp file
        cleanupTemp(req.file.path);

        next();
    } catch (error) {
        // Cleanup temp file on error
        cleanupTemp(req.file.path);

        // Handle specific error types
        if (error.message === 'Upload timeout') {
            return res.status(504).json({ 
                status: 'error',
                message: 'Upload timed out. Please try again.' 
            });
        }

        console.error('ImageKit Upload Error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error uploading image',
            details: error.message 
        });
    }
};

// Helper function to determine image path based on route
export const setImagePath = (path) => (req, res, next) => {
    req.imagePath = path;
    next();
};

// Cleanup temporary files periodically (run every hour)
setInterval(() => {
    const tempDir = 'uploads/temp';
    if (fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) {
                console.error('Error reading temp directory:', err);
                return;
            }

            const now = Date.now();
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        console.error('Error getting file stats:', err);
                        return;
                    }

                    // Remove files older than 1 hour
                    if (now - stats.mtimeMs > 3600000) {
                        cleanupTemp(filePath);
                    }
                });
            });
        });
    }
}, 3600000);

export default upload;
