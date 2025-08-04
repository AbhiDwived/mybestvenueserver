import express from 'express';
import upload from '../middlewares/upload.js';
import { uploadToStorage } from '../middlewares/imageKitUpload.js';

import {
    createBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    getBlogsByCategory,
    searchBlogs
} from '../controllers/blogController.js';

import { VerifyVendor, VerifyAdmin, CheckVendorApproval } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
// Deep comment: Anyone can fetch all blogs, a blog by ID, blogs by category, or search blogs
router.get('/getallblogs', getAllBlogs); // Deep comment: Fetch all blogs (paginated or filtered)
router.get('/getblog/:id', getBlogById); // Deep comment: Fetch a single blog by its MongoDB ID
router.get('/category/:name', getBlogsByCategory); // Deep comment: Fetch blogs by category name
router.get('/search', searchBlogs); // Deep comment: Search blogs by keyword, tags, etc.

// Protected routes (vendor only)
// Deep comment: Only approved vendors can create, update, or delete their blogs

// Deep comment: Vendor creates a new blog post (image upload handled by uploadToStorage)
router.post('/create', 
    VerifyVendor, 
    CheckVendorApproval,
    upload.single('image'),
    (req, res, next) => {
        // Deep comment: Set the folder path for blog images
        req.imagePath = 'blogs';
        next();
    },
    uploadToStorage,
    createBlog
);

// Deep comment: Vendor updates an existing blog post (image upload handled by uploadToStorage)
router.put('/updateblog/:id', 
    VerifyVendor,
    CheckVendorApproval,
    upload.single('image'),
    (req, res, next) => {
        // Deep comment: Set the folder path for blog images
        req.imagePath = 'blogs';
        next();
    },
    uploadToStorage,
    updateBlog
);

// Deep comment: Vendor deletes a blog post by its ID
router.delete('/deleteblog/:id', 
    VerifyVendor, 
    deleteBlog
);

export default router;
