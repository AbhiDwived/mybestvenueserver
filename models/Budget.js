import mongoose from 'mongoose';

const budgetItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Category is required'],
  },
  planned: {
    type: Number,
    required: [true, 'Planned amount is required'],
    min: 0,
  },
  actual: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    items: [budgetItemSchema],
    totalPlanned: {
      type: Number,
      default: 0,
    },
    totalActual: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Export the model
const Budget = mongoose.model('Budget', budgetSchema);

export default Budget;
