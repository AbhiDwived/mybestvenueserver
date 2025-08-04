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

// Create a new blog post (only vendors can create)
export const createBlog = async (req, res) => {
    try {
        const { title, content, excerpt, category } = req.body;
        const vendorId = req.user.id;

        // Image is required for every blog post
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Blog image is required'
            });
        }

        // Save blog with image path (from cloud or local)
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

// Get all blog posts (with author info, newest first)
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

// Get blogs by category (with author info)
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

// Search blog posts by keyword (title, content, or category)
export const searchBlogs = async (req, res) => {
    try {
        const { keyword } = req.query;
        // Flexible search using regex, case-insensitive
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

// Get single blog post by ID (with author info)
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

// Update blog post (only author/vendor can update)
export const updateBlog = async (req, res) => {
    try {
        const { title, content, excerpt, category } = req.body;
        const vendorId = req.user.id;

        // Only the author/vendor can update their own blog
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

        // If a new image is uploaded, update the image path
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

// Delete blog post (only author/vendor or admin can delete)
export const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Only the author or an admin can delete the blog
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