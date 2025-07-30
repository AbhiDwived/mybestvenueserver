import AdminBlog from '../models/AdminBlog.js';
import Admin from '../models/Admin.js';
import imagekit from '../config/imagekit.js';

// Helper function to extract file ID from ImageKit URL
const getImageKitFileId = (url) => {
    try {
        // ImageKit URLs typically end with the file ID
        // Example: https://ik.imagekit.io/your_account/folder/filename_fileId
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        // The file ID is typically after the last underscore
        const fileId = filename.split('_').pop();
        return fileId;
    } catch (error) {
        console.error('Error extracting ImageKit file ID:', error);
        return null;
    }
};

// Helper function to calculate reading time
const calculateReadingTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
};

// Helper function to generate table of contents
const generateTableOfContents = (content) => {
    const headingRegex = /<h([1-6]).*?>(.*?)<\/h[1-6]>/gi;
    const headings = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
        headings.push({
            level: parseInt(match[1]),
            text: match[2].replace(/<[^>]*>/g, ''),
            id: match[2].replace(/<[^>]*>/g, '').toLowerCase().replace(/\s+/g, '-')
        });
    }
    
    return headings;
};

// Create a new blog post
export const createBlog = async (req, res) => {
    try {
        const { 
            title, 
            category, 
            excerpt, 
            content, 
            richContent,
            tableOfContents,
            seoTitle,
            seoDescription,
            seoKeywords,
            tags,
            status = 'Published'
        } = req.body;
        const imageUrl = req.imageUrl;

        // Comprehensive validation
        const errors = [];
        
        // Title validation
        if (!title || !title.trim()) {
            errors.push('Title is required');
        } else if (title.length > 100) {
            errors.push('Title must be 100 characters or less');
        }
        
        // Excerpt validation
        if (!excerpt || !excerpt.trim()) {
            errors.push('Excerpt is required');
        } else if (excerpt.length < 50) {
            errors.push('Excerpt must be at least 50 characters');
        } else if (excerpt.length > 250) {
            errors.push('Excerpt must be 250 characters or less');
        }
        
        // Content validation (text-only, minimum 100 characters)
        if (!content || !content.trim()) {
            errors.push('Content is required');
        } else {
            const textContent = content.replace(/<[^>]*>/g, '').trim();
            if (textContent.length < 100) {
                errors.push('Content must be at least 100 characters (text only)');
            }
        }
        
        // Image validation
        if (req.file) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (req.file.size > maxSize) {
                errors.push('Image size must be less than 10MB');
            }
            
            const allowedTypes = ['image/jpeg', 'image/png'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                errors.push('Only JPEG and PNG images are allowed');
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }
        
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
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

        // Calculate reading time
        const readingTime = calculateReadingTime(content);

        // Generate slug from title
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        const newBlog = await AdminBlog.create({
            title,
            slug,
            category,
            featuredImage: imageUrl,
            excerpt,
            content,
            richContent: richContent ? JSON.parse(richContent) : null,
            tableOfContents: tableOfContents === 'true',
            readingTime,
            seoTitle: seoTitle || title,
            seoDescription: seoDescription || excerpt.substring(0, 160),
            seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : [],
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            createdBy: admin._id,
            createdByModel: 'Admin',
            status
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

// Get a single blog by slug
export const getBlogBySlug = async (req, res) => {
    try {
        const requestedSlug = req.params.slug;
        
        // First try to find by slug
        let blog = await AdminBlog.findOne({ slug: requestedSlug })
            .populate('createdBy', 'name email');

        // If not found, try regex search on title (more efficient)
        if (!blog) {
            const titleRegex = requestedSlug.replace(/-/g, '\\s+');
            blog = await AdminBlog.findOne({ 
                title: { $regex: titleRegex, $options: 'i' } 
            }).populate('createdBy', 'name email');
            
            // Update with slug if found
            if (blog) {
                blog.slug = requestedSlug;
                await blog.save();
            }
        }

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
        console.error('getBlogBySlug error:', error);
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
        const { 
            title, 
            category, 
            excerpt, 
            content,
            richContent,
            tableOfContents,
            seoTitle,
            seoDescription,
            seoKeywords,
            tags,
            status
        } = req.body;
        
        // Comprehensive validation for update
        const errors = [];
        
        // Title validation
        if (title !== undefined) {
            if (!title || !title.trim()) {
                errors.push('Title is required');
            } else if (title.length > 100) {
                errors.push('Title must be 100 characters or less');
            }
        }
        
        // Excerpt validation
        if (excerpt !== undefined) {
            if (!excerpt || !excerpt.trim()) {
                errors.push('Excerpt is required');
            } else if (excerpt.length < 50) {
                errors.push('Excerpt must be at least 50 characters');
            } else if (excerpt.length > 250) {
                errors.push('Excerpt must be 250 characters or less');
            }
        }
        
        // Content validation
        if (content !== undefined) {
            if (!content || !content.trim()) {
                errors.push('Content is required');
            } else {
                const textContent = content.replace(/<[^>]*>/g, '').trim();
                if (textContent.length < 100) {
                    errors.push('Content must be at least 100 characters (text only)');
                }
            }
        }
        
        // Image validation if new image is uploaded
        if (req.file) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (req.file.size > maxSize) {
                errors.push('Image size must be less than 10MB');
            }
            
            const allowedTypes = ['image/jpeg', 'image/png'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                errors.push('Only JPEG and PNG images are allowed');
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }
        const updateData = {
            ...(title !== undefined && { 
                title,
                slug: title.toLowerCase()
                    .replace(/[^a-z0-9 -]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim('-')
            }),
            ...(category !== undefined && { category }),
            ...(excerpt !== undefined && { excerpt }),
            ...(content !== undefined && { content }),
            ...(richContent !== undefined && { richContent: richContent ? JSON.parse(richContent) : null }),
            ...(tableOfContents !== undefined && { tableOfContents: tableOfContents === 'true' }),
            ...(content !== undefined && { readingTime: calculateReadingTime(content) }),
            ...(seoTitle !== undefined && { seoTitle: seoTitle || title }),
            ...(seoDescription !== undefined && { seoDescription: seoDescription || excerpt.substring(0, 160) }),
            ...(seoKeywords !== undefined && { seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : [] }),
            ...(tags !== undefined && { tags: tags ? tags.split(',').map(t => t.trim()) : [] }),
            ...(status !== undefined && { status: status || 'Published' })
        };

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

        // If new image is uploaded, delete the old image from ImageKit
        if (req.imageUrl && blog.featuredImage) {
            try {
                const fileId = getImageKitFileId(blog.featuredImage);
                if (fileId) {
                    await imagekit.deleteFile(fileId);
                }
            } catch (error) {
                console.error('Error deleting old image from ImageKit:', error);
                // Continue with update even if old image deletion fails
            }
            updateData.featuredImage = req.imageUrl;
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

        // Delete image from ImageKit if it exists
        if (blog.featuredImage) {
            try {
                const fileId = getImageKitFileId(blog.featuredImage);
                if (fileId) {
                    await imagekit.deleteFile(fileId);
                }
            } catch (error) {
                console.error('Error deleting image from ImageKit:', error);
                // Continue with blog deletion even if image deletion fails
            }
        }

        await blog.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Blog and associated image deleted successfully'
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

// Upload image for rich text editor
export const uploadEditorImage = async (req, res) => {
    try {
        if (!req.imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'No image uploaded'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            url: req.imageUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message
        });
    }
};

// Generate table of contents from content
export const generateTOC = async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required'
            });
        }

        const toc = generateTableOfContents(content);
        
        res.status(200).json({
            success: true,
            tableOfContents: toc
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating table of contents',
            error: error.message
        });
    }
};

// Get blog with table of contents
export const getBlogWithTOC = async (req, res) => {
    try {
        const blog = await AdminBlog.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Generate TOC if enabled
        let tableOfContents = null;
        if (blog.tableOfContents) {
            tableOfContents = generateTableOfContents(blog.content);
        }

        // Increment views
        await blog.incrementViews();

        res.status(200).json({
            success: true,
            blog: {
                ...blog.toObject(),
                tableOfContents
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching blog',
            error: error.message
        });
    }
};