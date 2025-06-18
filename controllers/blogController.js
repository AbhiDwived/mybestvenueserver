import Blog from '../models/Blog.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import { uploadToImageKit } from '../middlewares/upload.js';

// Create a new blog post (vendor only)
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
            image: `/uploads/blogs/${req.file.filename}`
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

// Get all blogs
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

// Get blogs by category
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

// Search blogs
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

// Get a single blog post by ID
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

// Update a blog post (vendor only)
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
            updateData.image = `/uploads/blogs/${req.file.filename}`;
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

// Delete a blog post (vendor/admin only)
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