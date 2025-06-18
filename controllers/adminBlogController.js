import AdminBlog from '../models/AdminBlog.js';
import Admin from '../models/Admin.js';

// Create a new blog post
export const createBlog = async (req, res) => {
    try {
        const { title, category, excerpt, content } = req.body;
        const image = req.file;

        // Validate required fields
        if (!title || !category || !excerpt || !content || !image) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required, including image'
            });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Not an admin'
            });
        }

        const admin = await Admin.findOne({ email: req.user.email });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Admin not found in database'
            });
        }

        const featuredImage = `/uploads/admin/${image.filename}`;

        const newBlog = await AdminBlog.create({
            title,
            category,
            featuredImage,
            excerpt,
            content,
            createdBy: admin._id,
            createdByModel: 'Admin',
            status: 'Published'
        });

        res.status(201).json({
            success: true,
            message: 'Blog post created successfully',
            blog: newBlog
        });
    } catch (error) {
        console.error('Error creating blog:', error);
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
        const blogs = await AdminBlog.find()
            .populate('createdBy', 'name email')
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

// Get a single blog by ID
export const getBlogById = async (req, res) => {
    try {
        const blog = await AdminBlog.findById(req.params.id)
            .populate('createdBy', 'name email');

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

// Update a blog post
export const updateBlog = async (req, res) => {
    try {
        const { title, category, excerpt, content } = req.body;
        const updateData = {
            title,
            category,
            excerpt,
            content
        };

        // If new image is uploaded, update the image path
        if (req.file) {
            updateData.featuredImage = `/uploads/admin/${req.file.filename}`;
        }

        const blog = await AdminBlog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Check if user is admin and created this blog
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Not an admin'
            });
        }

        const updatedBlog = await AdminBlog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            blog: updatedBlog
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating blog',
            error: error.message
        });
    }
};

// Delete a blog post
export const deleteBlog = async (req, res) => {
    try {
        const blog = await AdminBlog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Not an admin'
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

// Get blogs by category
export const getBlogsByCategory = async (req, res) => {
    try {
        const blogs = await AdminBlog.find({ category: req.params.name })
            .populate('createdBy', 'name email')
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

// Search blogs by keyword
export const searchBlogs = async (req, res) => {
    try {
        const { keyword } = req.query;
        const searchQuery = keyword ? {
            $or: [
                { title: { $regex: keyword, $options: 'i' } },
                { excerpt: { $regex: keyword, $options: 'i' } },
                { content: { $regex: keyword, $options: 'i' } },
                { category: { $regex: keyword, $options: 'i' } }
            ]
        } : {};

        const blogs = await AdminBlog.find(searchQuery)
            .populate('createdBy', 'name email')
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