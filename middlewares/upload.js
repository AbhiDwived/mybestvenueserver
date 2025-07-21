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

// S3 upload middleware
export const uploadToS3 = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${timestamp}-${req.file.originalname.replace(fileExtension, '')}${fileExtension}`;
        
        // Determine folder path
        const folderPath = req.imagePath || 'uploads';
        const key = `${folderPath}/${fileName}`;

        // Upload to S3
        const params = {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
            // Removed ACL: 'public-read' as the bucket doesn't allow ACLs
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Generate S3 URL
        const s3Url = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        
        // Add S3 URL to request object
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
            return next();
        }

        // Convert buffer to base64
        const fileStr = req.file.buffer.toString('base64');

        // Upload to ImageKit
        const response = await imagekit.upload({
            file: fileStr,
            fileName: `${Date.now()}-${req.file.originalname}`,
            folder: req.imagePath || 'uploads' // Default folder if not specified
        });

        // Add ImageKit URL to request object
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
            return next();
        }
        
        // Use S3 or ImageKit based on configuration
        if (STORAGE_TYPE === 's3') {
            await uploadToS3(req, res, () => {});
        } else {
            await uploadToImageKit(req, res, () => {});
        }
        
        next();
    } catch (error) {
        console.error('Storage Upload Error:', error);
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};

// Helper function to determine image path based on route
export const setImagePath = (path) => (req, res, next) => {
    req.imagePath = path;
    next();
};

export default upload;
