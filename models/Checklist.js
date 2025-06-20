import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  task: {
    type: String,
    required: [true, 'Task description is required'],
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const checklistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    items: [checklistItemSchema],
    completedCount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Export the model
const Checklist = mongoose.model('Checklist', checklistSchema);

export default Checklist;
