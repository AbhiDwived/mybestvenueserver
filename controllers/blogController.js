// File: server/controllers/blogController.js

import Blog from '../models/Blog.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js'; // Assuming you have an Admin model
import User from '../models/User.js';

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

    // Check role from token payload
    if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Not authorized to create blog' });
    }

    let creator;

    if (req.user.role === 'admin') {
      creator = await User.findById(req.user.id || req.user._id);
      if (!creator) {
        return res.status(401).json({ message: 'Admin user not found' });
      }
    } else if (req.user.role === 'vendor') {
      creator = await Vendor.findById(req.user.id || req.user._id);
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

// Update a blog post
export const updateBlog = async (req, res) => {
  try {
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
    
    if (!updatedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.status(200).json({
      message: 'Blog updated successfully',
      blog: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating blog', error: error.message });
  }
};

// Delete a blog post
export const deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
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