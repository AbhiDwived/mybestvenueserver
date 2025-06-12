// File: server/controllers/blogController.js

import Blog from '../models/Blog.js';
import Admin from '../models/Admin.js'; // Assuming you have an Admin model
import User from '../models/User.js';
import Vendor from '../models/Vendor.js'; // Add this import

// Create a new blog post (admin/vendor only)
export const createBlog = async (req, res) => {
  console.log('👤 User from token:', req.user);
  console.log('📩 Incoming headers:', req.headers);

  try {
    const { title, category, excerpt, content } = req.body;
    const image = req.file; // Get uploaded image via multer

    // Validate required fields
    if (!title || !category || !excerpt || !content || !image) {
      return res.status(400).json({ message: 'All fields are required, including image' });
    }

    // Check role from token payload (req.user is set by VerifyAdmin/VerifyVendor middleware)
    if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Not authorized to create blog' });
    }

    let creator;

    if (req.user.role === 'admin') {
      // Use req.user.id which is set by VerifyAdmin middleware
      creator = await User.findById(req.user.id);
      if (!creator) {
        return res.status(401).json({ message: 'Admin user not found' });
      }
    } else if (req.user.role === 'vendor') {
      creator = await Vendor.findById(req.user.id);
      if (!creator) {
        return res.status(401).json({ message: 'Vendor user not found' });
      }
    }

    // ✅ Correct image path based on upload directory
    const featuredImage = `/uploads/vendors/${image.filename}`;

    const newBlog = await Blog.create({
      title,
      category,
      featuredImage,
      excerpt,
      content,
      createdBy: creator._id,
      createdByModel: req.user.role === 'admin' ? 'User' : 'Vendor',
    });

    res.status(201).json({
      message: 'Blog post created successfully',
      blog: newBlog,
    });
  } catch (error) {
    console.error('Error creating blog:', error.message);
    res.status(500).json({ message: 'Error creating blog post', error: error.message });
  }
};

// Get all blogs
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Blogs fetched successfully',
      blogs,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blogs', error: error.message });
  }
};

// Get a single blog by ID
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.status(200).json({
      message: 'Blog fetched successfully',
      blog,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blog', error: error.message });
  }
};

// Update a blog post (with admin/vendor authorization check)
export const updateBlog = async (req, res) => {
  try {
    // First, find the blog to check ownership
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if the user is authorized to update this blog
    const userId = req.user.id; // From VerifyAdmin/VerifyVendor middleware
    const userRole = req.user.role;

    // Only allow update if:
    // 1. Admin updating their own blog
    // 2. Vendor updating their own blog
    if (blog.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this blog' });
    }

    const updateData = { ...req.body };
    
    // ✅ If a new image is uploaded, update the featuredImage path
    if (req.file) {
      updateData.featuredImage = `/uploads/vendors/${req.file.filename}`;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    res.status(200).json({
      message: 'Blog updated successfully',
      blog: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating blog', error: error.message });
  }
};

// Delete a blog post (with admin/vendor authorization check)
export const deleteBlog = async (req, res) => {
  try {
    // First, find the blog to check ownership
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if the user is authorized to delete this blog
    const userId = req.user.id; // From VerifyAdmin/VerifyVendor middleware
    
    // Only allow delete if the user created the blog
    if (blog.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this blog' });
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting blog', error: error.message });
  }
};

// Get blogs by category
export const getBlogsByCategory = async (req, res) => {
  try {
    const blogs = await Blog.find({ category: req.params.name }).sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Blogs by category fetched successfully',
      blogs,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blogs by category', error: error.message });
  }
};

// Search blogs by keyword
export const searchBlogs = async (req, res) => {
  try {
    const { keyword } = req.query;
    const blogs = await Blog.find({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { excerpt: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
        { category: { $regex: keyword, $options: 'i' } },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Search results',
      blogs,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching blogs', error: error.message });
  }
};

// Add this new function for admin-specific blog operations
export const getAdminBlogs = async (req, res) => {
  try {
    const adminId = req.user.id; // From VerifyAdmin middleware
    
    // Get all blogs created by this admin
    const blogs = await Blog.find({ 
      createdBy: adminId,
      createdByModel: 'User' // Since admins are stored in User model
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Admin blogs fetched successfully',
      blogs,
      count: blogs.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin blogs', error: error.message });
  }
};