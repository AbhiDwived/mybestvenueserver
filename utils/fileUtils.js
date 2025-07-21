import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { S3_BUCKET_NAME } from '../config/s3.js';
import imagekit from '../config/imagekit.js';

/**
 * Extract ImageKit file ID from URL
 * @param {string} url - The ImageKit URL
 * @returns {string|null} - The file ID or null if not an ImageKit URL
 */
export const getImageKitFileId = (url) => {
  if (!url || !url.includes('imagekit.io')) return null;
  
  try {
    // Example URL: https://ik.imagekit.io/your_account/folder/filename_fileId
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    const fileId = lastPart.split('_').pop();
    return fileId;
  } catch (error) {
    console.error('Error extracting ImageKit file ID:', error);
    return null;
  }
};

/**
 * Extract S3 key from URL
 * @param {string} url - The S3 URL
 * @returns {string|null} - The S3 key or null if not an S3 URL
 */
export const getS3KeyFromUrl = (url) => {
  if (!url || !url.includes('amazonaws.com')) return null;
  
  try {
    const urlObj = new URL(url);
    // Remove the leading slash
    return urlObj.pathname.substring(1);
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
};

/**
 * Delete a file from S3
 * @param {string} url - The S3 URL or key
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export const deleteFromS3 = async (url) => {
  try {
    // Extract key from URL if it's a full URL
    const key = getS3KeyFromUrl(url) || url;
    
    if (!key) return false;

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

/**
 * Delete a file from ImageKit
 * @param {string} url - The ImageKit URL or fileId
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export const deleteFromImageKit = async (url) => {
  try {
    // Extract fileId from URL if it's a full URL
    const fileId = getImageKitFileId(url) || url;
    
    if (!fileId) return false;

    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    console.error('ImageKit Delete Error:', error);
    return false;
  }
};

/**
 * Delete a file from either S3 or ImageKit based on the URL
 * @param {string} url - The file URL
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export const deleteFile = async (url) => {
  try {
    if (!url) return false;
    
    if (url.includes('amazonaws.com')) {
      return await deleteFromS3(url);
    } else if (url.includes('imagekit.io')) {
      return await deleteFromImageKit(url);
    }
    
    return false;
  } catch (error) {
    console.error('Delete File Error:', error);
    return false;
  }
};