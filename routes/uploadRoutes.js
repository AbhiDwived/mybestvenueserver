import express from 'express';
import { createUploadMiddleware, processUploadedFile, cleanupFile } from '../utils/fileUploadUtils.js';
import { VerifyUser, VerifyVendor, VerifyAdmin } from '../middlewares/authMiddleware.js';
import { rateLimit } from 'express-rate-limit';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import Logger from '../utils/logger.js';
import { validateRequest } from '../middlewares/apiResponse.js';
import { uploadValidations } from '../validations/uploadValidations.js';
import { successResponse, createdResponse, errorResponse } from '../middlewares/apiResponse.js';

const router = express.Router();
const API_VERSION = 'v1';

// Simple cache implementation using Map
class SimpleCache {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { value, expiresAt });
    setTimeout(() => this.delete(key), this.ttl);
  }

  get(key) {
    const data = this.cache.get(key);
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      this.delete(key);
      return null;
    }
    return data.value;
  }

  delete(key) {
    this.cache.delete(key);
  }
}

const fileCache = new SimpleCache(300000);

// Monitoring middleware
const monitorRequest = (req, res, next) => {
  const startTime = Date.now();
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    Logger.access(req.method, req.originalUrl, res.statusCode, responseTime, {
      userType: req.user?.role,
      userId: req.user?.id
    });
    originalEnd.apply(res, args);
  };
  next();
};

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many file uploads from this IP, please try again later'
});

// Async file operations
const readDirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Cache middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = fileCache.get(key);

    if (cachedResponse) {
      Logger.debug('Cache hit', { key });
      return successResponse(res, 'Data retrieved from cache', cachedResponse);
    }

    Logger.debug('Cache miss', { key });
    const originalJson = res.json;
    res.json = function(body) {
      fileCache.set(key, body.data);
      res.json = originalJson;
      return res.json(body);
    };
    next();
  };
};

// Get file list with pagination
const getFileList = async (directory, page = 1, limit = 10) => {
  const files = await readDirAsync(directory);
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const filePromises = files.slice(startIndex, endIndex).map(async (filename) => {
    const filePath = path.join(directory, filename);
    const stats = await statAsync(filePath);
    return {
      filename,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  });

  const fileDetails = await Promise.all(filePromises);
  
  return {
    files: fileDetails,
    pagination: {
      total: files.length,
      page,
      totalPages: Math.ceil(files.length / limit),
      hasMore: endIndex < files.length
    }
  };
};

// Stream file upload handler
const handleStreamUpload = async (readStream, filePath) => {
  const startTime = Date.now();
  const writeStream = fs.createWriteStream(filePath);
  
  try {
    await pipeline(readStream, writeStream);
    const stats = await statAsync(filePath);
    const duration = Date.now() - startTime;
    
    Logger.metrics.recordUpload(stats.size, duration);
    Logger.info('File upload successful', {
      filePath,
      size: stats.size,
      duration
    });
    
    return true;
  } catch (error) {
    Logger.error('Stream upload error', {
      error: error.message,
      filePath
    });
    throw new Error(`Error streaming file: ${error.message}`);
  }
};

// Create upload middlewares for different categories
const userUpload = createUploadMiddleware('PROFILE');
const vendorUpload = createUploadMiddleware('VENUE');
const adminUpload = createUploadMiddleware('DOCUMENT');

// API Routes
router.get('/metrics',
  monitorRequest,
  VerifyAdmin,
  validateRequest(uploadValidations.getMetrics),
  (req, res) => {
    const metrics = Logger.metrics.getMetrics();
    return successResponse(res, 'Metrics retrieved successfully', metrics);
  }
);

router.get('/files/:userType',
  monitorRequest,
  validateRequest(uploadValidations.getFiles),
  cacheMiddleware(300000),
  async (req, res) => {
    try {
      const { userType } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const directory = path.join('uploads', userType);

      Logger.info('Fetching file list', {
        userType,
        page,
        limit
      });

      const result = await getFileList(directory, parseInt(page), parseInt(limit));
      return successResponse(res, 'Files retrieved successfully', result);
    } catch (error) {
      Logger.error('Error fetching file list', {
        error: error.message,
        userType: req.params.userType
      });
      
      return errorResponse(res, error.message);
    }
  }
);

router.post('/user/single',
  monitorRequest,
  VerifyUser,
  uploadLimiter,
  userUpload.single('file'),
  validateRequest(uploadValidations.singleUpload),
  async (req, res) => {
    try {
      Logger.info('Starting user file upload', {
        userId: req.user.id,
        filename: req.file.originalname
      });

      const processedFile = await processUploadedFile(req.file, 'PROFILE');
      fileCache.delete('/files/users');
      
      Logger.upload('UPLOAD_SUCCESS', processedFile.filename, {
        userId: req.user.id,
        size: processedFile.size
      });

      return createdResponse(res, 'File uploaded successfully', processedFile);
    } catch (error) {
      Logger.error('User file upload failed', {
        userId: req.user.id,
        error: error.message
      });

      if (req.file) {
        await cleanupFile(req.file.path);
      }
      return errorResponse(res, error.message);
    }
  }
);

router.post('/user/multiple',
  monitorRequest,
  VerifyUser,
  uploadLimiter,
  userUpload.array('files', 5),
  validateRequest(uploadValidations.multipleUpload),
  async (req, res) => {
    const processedFiles = [];

    try {
      if (!req.files || req.files.length === 0) {
        throw new Error('No files uploaded');
      }

      Logger.info('Starting multiple file upload', {
        userId: req.user.id,
        fileCount: req.files.length
      });

      // Process each file
      for (const file of req.files) {
        const processedFile = await processUploadedFile(file, 'PROFILE');
        processedFiles.push(processedFile);
        
        Logger.upload('UPLOAD_SUCCESS', processedFile.filename, {
          userId: req.user.id,
          size: processedFile.size
        });
      }

      fileCache.delete('/files/users');
      return createdResponse(res, 'Files uploaded successfully', { files: processedFiles });
    } catch (error) {
      Logger.error('Multiple file upload failed', {
        userId: req.user.id,
        error: error.message
      });

      // Cleanup any processed files
      for (const file of processedFiles) {
        await cleanupFile(file.path);
      }

      return errorResponse(res, error.message);
    }
  }
);

router.post('/vendor/single',
  monitorRequest,
  VerifyVendor,
  uploadLimiter,
  vendorUpload.single('file'),
  validateRequest(uploadValidations.singleUpload),
  async (req, res) => {
    try {
      Logger.info('Starting vendor file upload', {
        vendorId: req.user.id,
        filename: req.file.originalname
      });

      const processedFile = await processUploadedFile(req.file, 'VENUE');
      fileCache.delete('/files/vendors');
      
      Logger.upload('UPLOAD_SUCCESS', processedFile.filename, {
        vendorId: req.user.id,
        size: processedFile.size
      });

      return createdResponse(res, 'File uploaded successfully', processedFile);
    } catch (error) {
      Logger.error('Vendor file upload failed', {
        vendorId: req.user.id,
        error: error.message
      });

      if (req.file) {
        await cleanupFile(req.file.path);
      }
      return errorResponse(res, error.message);
    }
  }
);

router.post('/vendor/multiple',
  monitorRequest,
  VerifyVendor,
  uploadLimiter,
  vendorUpload.array('files', 5),
  validateRequest(uploadValidations.multipleUpload),
  async (req, res) => {
    const processedFiles = [];

    try {
      if (!req.files || req.files.length === 0) {
        throw new Error('No files uploaded');
      }

      Logger.info('Starting multiple vendor file upload', {
        vendorId: req.user.id,
        fileCount: req.files.length
      });

      for (const file of req.files) {
        const processedFile = await processUploadedFile(file, 'VENUE');
        processedFiles.push(processedFile);

        Logger.upload('UPLOAD_SUCCESS', processedFile.filename, {
          vendorId: req.user.id,
          size: processedFile.size
        });
      }

      fileCache.delete('/files/vendors');
      return createdResponse(res, 'Files uploaded successfully', processedFiles);
    } catch (error) {
      Logger.error('Multiple vendor file upload failed', {
        vendorId: req.user.id,
        error: error.message
      });

      // Cleanup any processed files
      for (const file of processedFiles) {
        await cleanupFile(file.path);
      }
      return errorResponse(res, error.message);
    }
  }
);

router.post('/admin/single',
  monitorRequest,
  VerifyAdmin,
  uploadLimiter,
  adminUpload.single('file'),
  validateRequest(uploadValidations.singleUpload),
  async (req, res) => {
    try {
      Logger.info('Starting admin file upload', {
        adminId: req.user.id,
        filename: req.file.originalname
      });

      const processedFile = await processUploadedFile(req.file, 'DOCUMENT');
      fileCache.delete('/files/admin');
      
      Logger.upload('UPLOAD_SUCCESS', processedFile.filename, {
        adminId: req.user.id,
        size: processedFile.size
      });

      return createdResponse(res, 'File uploaded successfully', processedFile);
    } catch (error) {
      Logger.error('Admin file upload failed', {
        adminId: req.user.id,
        error: error.message
      });

      if (req.file) {
        await cleanupFile(req.file.path);
      }
      return errorResponse(res, error.message);
    }
  }
);

export default router;
