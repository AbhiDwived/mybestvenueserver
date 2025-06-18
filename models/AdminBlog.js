import mongoose from 'mongoose';
import slugify from 'slugify';

const adminBlogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Blog title is required'],
            trim: true
        },
        slug: {
            type: String,
            unique: true,
            index: true
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true
        },
        featuredImage: {
            type: String,
            required: [true, 'Featured image is required']
        },
        excerpt: {
            type: String,
            required: [true, 'Excerpt is required'],
            maxlength: 300
        },
        content: {
            type: String,
            required: [true, 'Content is required']
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true
        },
        createdByModel: {
            type: String,
            required: true,
            enum: ['Admin'],
            default: 'Admin'
        },
        status: {
            type: String,
            enum: ['Published', 'Draft', 'Archived'],
            default: 'Published'
        },
        views: {
            type: Number,
            default: 0
        },
        tags: [{
            type: String,
            trim: true
        }]
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Generate slug from title before saving
adminBlogSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, { lower: true, strict: true });
    }
    next();
});

// Virtual for formatted date
adminBlogSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Method to increment views
adminBlogSchema.methods.incrementViews = async function() {
    this.views += 1;
    return this.save();
};

// Compound index for efficient searching
adminBlogSchema.index({ title: 'text', content: 'text', category: 'text' });

const AdminBlog = mongoose.model('AdminBlog', adminBlogSchema);

export default AdminBlog;
