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

// Create blog post (admin or verified vendor only) with image upload
router.post('/create', VerifyAdmin, upload.single('image'), createBlog);

// Get all blogs (public)
router.get('/getallblogs', getAllBlogs);

// Get blog by ID
router.get('/getblog/:id', getBlogById);

// Update blog (admin/vendor only)
router.put('/updateblog/:id', VerifyAdmin,upload.single('image'), updateBlog);

// Delete blog (admin/vendor only)
router.delete('/deleteblog/:id', VerifyAdmin, deleteBlog);

// Get blogs by category (public)
router.get('/category/:name', getBlogsByCategory);

// Search blogs by keyword (public)
router.get('/search', searchBlogs);

export default router;
