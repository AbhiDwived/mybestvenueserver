import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { S3_BUCKET_NAME } from '../config/s3Config.js';
import imagekit from '../config/imagekit.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Determine which storage service to use
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'imagekit'; // Default to imagekit if not specified

// Upload a file to the configured storage service
export const uploadFile = async (fileBuffer, originalName, mimeType, folder = 'uploads') => {
  // Deep comment: Use S3 if configured, otherwise use ImageKit
  if (STORAGE_TYPE === 's3') {
    return uploadToS3(fileBuffer, originalName, mimeType, folder);
  } else {
    return uploadToImageKit(fileBuffer, originalName, folder);
  }
};

// Upload a file to S3
const uploadToS3 = async (fileBuffer, originalName, mimeType, folder) => {
  try {
    // Deep comment: Generate unique filename using timestamp and UUID
    const fileExtension = path.extname(originalName);
    const fileName = `${Date.now()}-${uuidv4()}${fileExtension}`;
    
    // Deep comment: Create the full key (path in S3)
    const key = `${folder}/${fileName}`;

    // Deep comment: Prepare S3 upload parameters
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType
      // Removed ACL: 'public-read' as the bucket doesn't allow ACLs
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Deep comment: Generate S3 URL for the uploaded file
    const s3Url = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    
    return {
      url: s3Url,
      key: key,
      name: fileName,
      size: fileBuffer.length,
      storageType: 's3'
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Error uploading to S3: ${error.message}`);
  }
};

// Upload a file to ImageKit
const uploadToImageKit = async (fileBuffer, originalName, folder) => {
  try {
    // Deep comment: Convert buffer to base64 for ImageKit upload
    const fileStr = fileBuffer.toString('base64');

    // Deep comment: Upload to ImageKit with folder path or default
    const response = await imagekit.upload({
      file: fileStr,
      fileName: `${Date.now()}-${originalName}`,
      folder: folder
    });

    return {
      url: response.url,
      fileId: response.fileId,
      name: response.name,
      size: response.size,
      storageType: 'imagekit'
    };
  } catch (error) {
    console.error('ImageKit Upload Error:', error);
    throw new Error(`Error uploading to ImageKit: ${error.message}`);
  }
};

// Delete a file from storage (S3 or ImageKit)
export const deleteFile = async (fileUrl) => {
  try {
    if (!fileUrl) return false;
    
    // Deep comment: Determine if it's an S3 or ImageKit URL
    if (fileUrl.includes('amazonaws.com')) {
      return await deleteFromS3(fileUrl);
    } else if (fileUrl.includes('imagekit.io')) {
      return await deleteFromImageKit(fileUrl);
    }
    
    return false;
  } catch (error) {
    console.error('Delete File Error:', error);
    return false;
  }
};

// Delete a file from S3
const deleteFromS3 = async (fileUrl) => {
  try {
    // Deep comment: Extract key from URL if it's a full S3 URL
    let key = fileUrl;
    if (fileUrl.includes('amazonaws.com')) {
      const urlObj = new URL(fileUrl);
      key = urlObj.pathname.substring(1); // Remove leading slash
    }

    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: key
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
};

// Delete a file from ImageKit
const deleteFromImageKit = async (fileUrl) => {
  try {
    // Deep comment: Extract fileId from ImageKit URL if needed
    let fileId = fileUrl;
    if (fileUrl.includes('imagekit.io')) {
      // Example URL: https://ik.imagekit.io/your_account/folder/filename_fileId
      const parts = fileUrl.split('/');
      const lastPart = parts[parts.length - 1];
      fileId = lastPart.split('_').pop();
    }

    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    console.error('ImageKit Delete Error:', error);
    return false;
  }
};

// Generate a signed URL for an S3 object (for private files)
export const getSignedFileUrl = async (key, expiresIn = 3600) => {
  try {
    // Deep comment: Generate a signed URL for secure access to private S3 objects
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Error generating signed URL: ${error.message}`);
  }
};