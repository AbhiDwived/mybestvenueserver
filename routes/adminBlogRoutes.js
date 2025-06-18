import express from 'express';
import upload from '../middlewares/upload.js';
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
    createBlog
);

router.put('/updateblog/:id',
    VerifyAdmin,
    upload.single('image'),
    updateBlog
);

router.delete('/deleteblog/:id',
    VerifyAdmin,
    deleteBlog
);

export default router;
