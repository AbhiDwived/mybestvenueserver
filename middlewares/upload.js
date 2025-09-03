import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { S3_BUCKET_NAME } from '../config/s3.js';
import imagekit from '../config/imagekit.js';
import dotenv from 'dotenv';

dotenv.config();

// Determine which storage service to use
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'imagekit';

// Configure multer to use memory storage for ImageKit
const storage = multer.memoryStorage();

// File filter to allow all supported image formats
const fileFilter = (req, file, cb) => {
    //  Log file details for debugging
    console.log('📄 File filter check:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });

    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'image/svg+xml',
        'image/x-icon',
        'image/vnd.microsoft.icon',
        'image/bmp',
        'image/apng',
        'image/heic',
        'image/heif'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        console.log('✅ File type accepted:', file.mimetype);
        cb(null, true);
    } else {
        console.log('❌ File type rejected:', file.mimetype);
        cb(new Error('Unsupported image format. Supported formats: JPEG, PNG, GIF, WebP, AVIF, SVG, ICO, BMP, APNG, HEIC'), false);
    }
};

// Configure upload with support for all image formats
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit for all image formats
        fieldSize: 2 * 1024 * 1024, // 2MB field size limit
        fields: 1000 // Allow up to 1000 fields
    },
    onError: (err, next) => {
        // Handle Multer errors and pass to next middleware
        console.error('❌ Multer error:', err);
        next(err);
    }
});

// S3 upload middleware
export const uploadToS3 = async (req, res, next) => {
    try {
        if (!req.file) {
            //  Skip upload if no file present
            return next();
        }

        //  Generate unique filename using timestamp and original extension
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${timestamp}-${req.file.originalname.replace(fileExtension, '')}${fileExtension}`;

        //  Use provided folder path or default to 'uploads'
        const folderPath = req.imagePath || 'uploads';
        const key = `${folderPath}/${fileName}`;

        //  Prepare S3 upload parameters
        const params = {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
            // Removed ACL: 'public-read' as the bucket doesn't allow ACLs
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        //  Generate S3 URL and attach to request for downstream use
        const s3Url = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        req.fileUrl = s3Url;
        req.fileKey = key; // Store the key for potential deletion later

        next();
    } catch (error) {
        console.error('S3 Upload Error:', error);
        res.status(500).json({ message: 'Error uploading image to S3', error: error.message });
    }
};

// ImageKit upload middleware
export const uploadToImageKit = async (req, res, next) => {
    try {
        if (!req.file) {
            //  Skip upload if no file present
            return next();
        }

        //  Convert buffer to base64 for ImageKit upload
        const fileStr = req.file.buffer.toString('base64');

        //  Upload to ImageKit with folder path or default
        const response = await imagekit.upload({
            file: fileStr,
            fileName: `${Date.now()}-${req.file.originalname}`,
            folder: req.imagePath || 'uploads' // Default folder if not specified
        });

        //  Attach ImageKit URL and fileId to request for downstream use
        req.fileUrl = response.url;
        req.fileId = response.fileId; // Store the fileId for potential deletion later

        next();
    } catch (error) {
        console.error('ImageKit Upload Error:', error);
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};

// Unified upload middleware that chooses between S3 and ImageKit
export const uploadToStorage = async (req, res, next) => {
    try {
        if (!req.file) {
            //  Skip upload if no file present
            return next();
        }

        //  Use S3 or ImageKit based on configuration
        if (STORAGE_TYPE === 's3') {
            await uploadToS3(req, res, () => { });
        } else {
            await uploadToImageKit(req, res, () => { });
        }

        next();
    } catch (error) {
        console.error('Storage Upload Error:', error);
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};

// Helper function to determine image path based on route
export const setImagePath = (path) => (req, res, next) => {
    //  Attach the desired image folder path to the request for downstream use
    req.imagePath = path;
    next();
};

export default upload;
