import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  reportReason: { type: String },
  reportedAt: { type: Date },
  status: { type: String, enum: ['pending', 'approved', 'on_hold'], default: 'pending' },
  adminHoldReason: { type: String }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review; 