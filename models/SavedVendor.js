import mongoose from 'mongoose';

const savedVendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor reference is required'],
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create a compound index to ensure a user can only save a vendor once
savedVendorSchema.index({ user: 1, vendor: 1 }, { unique: true });

// Export the model
const SavedVendor = mongoose.model('SavedVendor', savedVendorSchema);

export default SavedVendor; 