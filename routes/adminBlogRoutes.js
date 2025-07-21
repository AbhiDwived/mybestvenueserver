import express from 'express';
import upload from '../middlewares/upload.js';
import { uploadToImageKit, uploadToStorage } from '../middlewares/imageKitUpload.js';
import {
    createBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    getBlogsByCategory,
    searchBlogs
} from '../controllers/adminBlogController.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/getallblogs', getAllBlogs);
router.get('/getblog/:id', getBlogById);
router.get('/category/:name', getBlogsByCategory);
router.get('/search', searchBlogs);

// Protected routes (admin only)
router.post('/create',
    VerifyAdmin,
    upload.single('image'),
    uploadToStorage, // This will use either S3 or ImageKit based on STORAGE_TYPE
    createBlog
);

router.put('/updateblog/:id',
    VerifyAdmin,
    upload.single('image'),
    uploadToImageKit,
    updateBlog
);

router.delete('/deleteblog/:id',
    VerifyAdmin,
    deleteBlog
);

export default router;
