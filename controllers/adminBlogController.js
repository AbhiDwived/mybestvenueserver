import Blog from '../models/Blog.js';
import Admin from '../models/Admin.js';

export const createBlog = async (req, res) => {
  try {
    const { title, category, excerpt, content } = req.body;
    const image = req.file;

    if (!title || !category || !excerpt || !content || !image) {
      return res.status(400).json({ message: 'All fields are required, including image' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Not an admin' });
    }

    const admin = await Admin.findOne({ email: req.user.email });
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found in database' });
    }

    const featuredImage = `/uploads/admin/${image.filename}`;

    const newBlog = await Blog.create({
      title,
      category,
      featuredImage,
      excerpt,
      content,
      createdBy: admin._id,
      createdByModel: 'Admin',
    });

    res.status(201).json({
      message: 'Admin blog post created successfully',
      blog: newBlog,
    });
  } catch (error) {
    console.error('❌ Error creating blog:', error.message);
    res.status(500).json({ message: 'Error creating blog', error: error.message });
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

    if (req.file) {
      updateData.featuredImage = `/uploads/admin/${req.file.filename}`;
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