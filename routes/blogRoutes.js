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
router.get('/getallblogs', getAllBlogs);
router.get('/getblog/:id', getBlogById);
router.get('/category/:name', getBlogsByCategory);
router.get('/search', searchBlogs);

// Protected routes (vendor only)
router.post('/create', 
    VerifyVendor, 
    CheckVendorApproval,
    upload.single('image'),
    (req, res, next) => {
        // Set the folder path for blog images
        req.imagePath = 'blogs';
        next();
    },
    uploadToStorage,
    createBlog
);

router.put('/updateblog/:id', 
    VerifyVendor,
    CheckVendorApproval,
    upload.single('image'),
    (req, res, next) => {
        // Set the folder path for blog images
        req.imagePath = 'blogs';
        next();
    },
    uploadToStorage,
    updateBlog
);

router.delete('/deleteblog/:id', 
    VerifyVendor, 
    deleteBlog
);

export default router;
