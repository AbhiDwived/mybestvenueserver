import express from 'express';
import upload from '../middlewares/upload.js';
import { uploadToImageKit, uploadToStorage } from '../middlewares/imageKitUpload.js';
import {
    createBlog,
    getAllBlogs,
    getBlogById,
    getBlogBySlug,
    updateBlog,
    deleteBlog,
    getBlogsByCategory,
    searchBlogs,
    uploadEditorImage,
    generateTOC,
    getBlogWithTOC
} from '../controllers/adminBlogController.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
//  Anyone can fetch blogs, blog by ID/slug, category, search, or generate TOC
router.get('/getallblogs', getAllBlogs); //  Fetch all blogs (paginated or filtered)
router.get('/getblog/:id', getBlogById); //  Fetch a single blog by its MongoDB ID
router.get('/getblog-slug/:slug', getBlogBySlug); //  Fetch a blog by its SEO-friendly slug
router.get('/getblog-toc/:id', getBlogWithTOC); //  Fetch blog content with generated table of contents
router.get('/category/:name', getBlogsByCategory); //  Fetch blogs by category name
router.get('/search', searchBlogs); //  Search blogs by keyword, tags, etc.
router.post('/generate-toc', generateTOC); //  Generate table of contents for blog content

// Protected routes (admin only)
//  Only admins can create, update, or delete blogs and upload images

//  Create a new blog post (image upload handled by uploadToStorage)
router.post('/create',
    VerifyAdmin,
    upload.single('image'),
    uploadToStorage, // This will use either S3 or ImageKit based on STORAGE_TYPE
    createBlog
);

//  Update an existing blog post (image upload handled by uploadToImageKit)
router.put('/updateblog/:id',
    VerifyAdmin,
    upload.single('image'),
    uploadToImageKit,
    updateBlog
);

//  Delete a blog post by its ID (admin only)
router.delete('/deleteblog/:id',
    VerifyAdmin,
    deleteBlog
);

//  Upload an image from the rich text editor (admin only, uses uploadToStorage)
router.post('/upload-editor-image',
    VerifyAdmin,
    upload.single('image'),
    uploadToStorage,
    uploadEditorImage
);

export default router;
