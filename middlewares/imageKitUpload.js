import imagekit from '../config/imagekit.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { S3_BUCKET_NAME } from '../config/s3.js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Determine which storage service to use
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'imagekit';

// S3 upload middleware
export const uploadToS3 = async (req, res, next) => {
    try {
        console.log('📤 S3 Upload Middleware - File check:', {
            hasFile: !!req.file,
            fileName: req.file?.originalname,
            fileSize: req.file?.size,
            mimeType: req.file?.mimetype
        });
        
        if (!req.file) {
            console.log('⚠️ No file found in request, skipping S3 upload');
            return next();
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${timestamp}-${req.file.originalname.replace(fileExtension, '')}${fileExtension}`;
        
        // Determine folder path
        const folderPath = req.imagePath || 'uploads';
        const key = `${folderPath}/${fileName}`;
        
        console.log('📁 S3 Upload Details:', {
            bucket: S3_BUCKET_NAME,
            key: key,
            folderPath: folderPath,
            fileName: fileName
        });

        // Upload to S3
        const params = {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
            // Removed ACL: 'public-read' as the bucket doesn't allow ACLs
        };

        const command = new PutObjectCommand(params);
        console.log('🚀 Uploading to S3...');
        await s3Client.send(command);
        console.log('✅ S3 upload successful');

        // Generate S3 URL
        const s3Url = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        
        console.log('🔗 Generated S3 URL:', s3Url);
        
        // Add S3 URL to request object - set both for backward compatibility
        req.imageUrl = s3Url;
        req.fileUrl = s3Url;
        req.fileKey = key; // Store the key for potential deletion later
        
        next();
    } catch (error) {
        console.error('❌ S3 Upload Error:', {
            message: error.message,
            code: error.code,
            statusCode: error.$metadata?.httpStatusCode,
            stack: error.stack
        });
        return res.status(500).json({
            success: false,
            message: 'Error uploading image to S3',
            error: error.message,
            code: error.code
        });
    }
};

// ImageKit upload middleware
export const uploadToImageKit = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        // Convert buffer to base64
        const base64Image = req.file.buffer.toString('base64');

        // Upload to ImageKit
        const response = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}-${req.file.originalname}`,
            folder: req.imagePath || 'uploads' // Use the provided folder path or default
        });

        // Add ImageKit URL to request object - set both for backward compatibility
        req.imageUrl = response.url;
        req.fileUrl = response.url;
        req.fileId = response.fileId; // Store the fileId for potential deletion later
        
        next();
    } catch (error) {
        console.error('ImageKit Upload Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error uploading image to ImageKit',
            error: error.message
        });
    }
};

// Unified upload middleware that chooses between S3 and ImageKit
export const uploadToStorage = async (req, res, next) => {
    try {
        console.log('🗄️ Storage Upload Middleware:', {
            storageType: STORAGE_TYPE,
            hasFile: !!req.file,
            imagePath: req.imagePath
        });
        
        if (!req.file) {
            console.log('⚠️ No file found in uploadToStorage, skipping upload');
            return next();
        }
        
        // Use S3 or ImageKit based on configuration
        if (STORAGE_TYPE === 's3') {
            console.log('📤 Using S3 storage');
            await uploadToS3(req, res, () => {});
        } else {
            console.log('📤 Using ImageKit storage');
            await uploadToImageKit(req, res, () => {});
        }
        
        next();
    } catch (error) {
        console.error('❌ Storage Upload Error:', {
            message: error.message,
            stack: error.stack,
            storageType: STORAGE_TYPE
        });
        return res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message,
            storageType: STORAGE_TYPE
        });
    }
};