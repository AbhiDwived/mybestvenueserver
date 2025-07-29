/**
 * Blog Controller
 * 
 * This controller handles blog-related operations including:
 * - Creating, reading, updating, and deleting blog posts
 * - Blog search and filtering by category
 * - Image upload handling for blog posts
 * - Authorization checks for blog operations
 * 
 * @author Wedding Wire Team
 * @version 1.0.0
 */

import Blog from '../models/Blog.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import { uploadToImageKit } from '../middlewares/upload.js';

/**
 * Create a new blog post
 * 
 * Creates a new blog post with image upload. Only vendors can create blogs.
 * Requires title, content, excerpt, category, and an image file.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body with blog data
 * @param {Object} req.file - Uploaded image file
 * @param {Object} req.user - Authenticated user (vendor)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created blog details
 */
export const createBlog = async (req, res) => {
    try {
        const { title, content, excerpt, category } = req.body;
        const vendorId = req.user.id;

        // Validate image
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Blog image is required'
            });
        }

        // Create blog with image
        const blog = new Blog({
            title,
            content,
            excerpt,
            category,
            author: vendorId,
            image: req.file.location || `/uploads/blogs/${req.file.filename}`
        });

        await blog.save();
        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            blog
        });
    } catch (error) {
        console.error('Blog creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating blog post',
            error: error.message
        });
    }
};

/**
 * Get all blog posts
 * 
 * Retrieves all blog posts with author information.
 * Results are sorted by creation date (newest first).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of blog posts
 */
export const getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find()
            .populate('author', 'name email businessName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: blogs.length,
            blogs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blogs',
            error: error.message
        });
    }
};

/**
 * Get blogs by category
 * 
 * Retrieves all blog posts belonging to a specific category.
 * Results include author information and are sorted by creation date.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.name - Category name
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with filtered blog posts
 */
export const getBlogsByCategory = async (req, res) => {
    try {
        const { name } = req.params;
        const blogs = await Blog.find({ category: name })
            .populate('author', 'name email businessName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: blogs.length,
            blogs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blogs by category',
            error: error.message
        });
    }
};

/**
 * Search blog posts
 * 
 * Searches blog posts by keyword in title, content, or category.
 * Uses case-insensitive regex matching for flexible search.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.keyword - Search keyword
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with matching blog posts
 */
export const searchBlogs = async (req, res) => {
    try {
        const { keyword } = req.query;
        const searchQuery = keyword ? {
            $or: [
                { title: { $regex: keyword, $options: 'i' } },
                { content: { $regex: keyword, $options: 'i' } },
                { category: { $regex: keyword, $options: 'i' } }
            ]
        } : {};

        const blogs = await Blog.find(searchQuery)
            .populate('author', 'name email businessName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: blogs.length,
            blogs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching blogs',
            error: error.message
        });
    }
};

/**
 * Get single blog post by ID
 * 
 * Retrieves a specific blog post by its ID with author information.
 * Returns 404 if blog post is not found.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Blog post ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with blog post details
 */
export const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate('author', 'name email businessName');
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        
        res.status(200).json({
            success: true,
            blog
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blog',
            error: error.message
        });
    }
};

/**
 * Update blog post
 * 
 * Updates an existing blog post. Only the author (vendor) can update their own blog.
 * Supports updating title, content, excerpt, category, and optionally the image.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Blog post ID
 * @param {Object} req.body - Request body with update data
 * @param {Object} req.file - Optional new image file
 * @param {Object} req.user - Authenticated user (vendor)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated blog details
 */
export const updateBlog = async (req, res) => {
    try {
        const { title, content, excerpt, category } = req.body;
        const vendorId = req.user.id;

        // Check if blog exists and belongs to the vendor
        const existingBlog = await Blog.findOne({
            _id: req.params.id,
            author: vendorId
        });

        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found or you are not authorized to update this blog'
            });
        }

        const updateData = {
            title,
            content,
            excerpt,
            category
        };

        // If new image is uploaded, update the image path
        if (req.file) {
            updateData.image = req.file.location || `/uploads/blogs/${req.file.filename}`;
        }

        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('author', 'name email businessName');

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            blog
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating blog',
            error: error.message
        });
    }
};

/**
 * Delete blog post
 * 
 * Deletes a blog post. Only the author (vendor) or admin can delete a blog.
 * This is a permanent action and cannot be undone.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Blog post ID
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming deletion
 */
export const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Check if user is admin or the blog author
        if (req.user.id !== blog.author.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this blog'
            });
        }
        
        await blog.deleteOne();
        
        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting blog',
            error: error.message
        });
    }
};