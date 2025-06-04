import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  // What kind of activity? (registration, review, approval, etc.)
  type: {
    type: String,
    required: true,
    enum: [
      'User Registration',
      'Vendor Registration',
      'Vendor Application',
      'Vendor Approved',
      'Vendor Rejected',
      'Review Submitted',
      'Review Reported',
      'Review Approved',
      'Review Deleted',
      'Blog Post Published',
      'Content Updated',
      'Login',
      'Logout',
      'Profile Updated',
      'System Maintenance',
      // ...add more as needed
    ]
  },

  // Short description for the feed
  description: { type: String, required: true },

  // Who did it? (user, vendor, or admin)
  actor: {
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'actorModel' },
    name: String,
    role: { type: String, enum: ['user', 'vendor', 'admin'] }
  },
  actorModel: { type: String, enum: ['User', 'Vendor', 'Admin'] },

  // Optionally, who/what was affected (target)
  target: {
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetModel' },
    name: String,
    type: String // e.g. 'user', 'vendor', 'review', 'blog', etc.
  },
  targetModel: { type: String },

  // Extra info (for storing IDs, links, etc.)
  meta: { type: mongoose.Schema.Types.Mixed },

  // When did it happen?
  createdAt: { type: Date, default: Date.now }
});

// Optional: indexes for better performance on frequent queries
activitySchema.index({ createdAt: -1 });
activitySchema.index({ 'actor.id': 1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
