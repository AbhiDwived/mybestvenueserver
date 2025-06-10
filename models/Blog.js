import mongoose from 'mongoose';
import slugify from 'slugify';

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      default: '', // Allow blank or any string
      required: [true, 'Category is required'],
      trim: true,
    },
    featuredImage: {
      type: String,
      required: [true, 'Featured image is required'],
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      maxlength: 300,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    // Creator can be an Admin, Vendor or User (if admins stored in User model)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'createdByModel',
    },
    createdByModel: {
      type: String,
      required: true,
      enum: ['Admin', 'Vendor', 'User'], // Add 'User' if admins are stored in User collection
    },
    status: {
      type: String,
      enum: ['Published', 'Draft', 'Archived'],
      default: 'Draft',
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Generate slug from title before saving
blogSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
