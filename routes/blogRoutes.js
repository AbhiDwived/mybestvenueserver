import express from 'express';
import upload from '../middlewares/upload.js';  // your multer config file
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getBlogsByCategory,
  searchBlogs
} from '../controllers/blogController.js';
import { VerifyVendor, VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create blog post (admin or verified vendor only) with image upload
router.post('/create', VerifyVendor, upload.single('image'), createBlog);

// Get all blogs (public)
router.get('/getallblogs', getAllBlogs);

// Get blog by ID
router.get('/getblog/:id', getBlogById);

// Update blog (admin/vendor only)
router.put('/updateblog/:id', VerifyVendor, updateBlog);

// Delete blog (admin/vendor only)
router.delete('/deleteblog/:id', VerifyVendor, deleteBlog);

// Get blogs by category (public)
router.get('/category/:name', getBlogsByCategory);

// Search blogs by keyword (public)
router.get('/search', searchBlogs);

export default router;
