import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

// Create a review
export const createReview = async (req, res) => {
  try {
    const { vendor, booking, rating, comment } = req.body;
    const user = req.user._id;

    // Check for completed booking
    const completedBooking = await Booking.findOne({
      _id: booking,
      user,
      vendor,
      status: 'completed'
    });
    if (!completedBooking) {
      return res.status(400).json({ message: 'You can only review after completing a booking.' });
    }
    // Prevent duplicate review for the same booking
    const existingReview = await Review.findOne({ user, vendor, booking });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this booking.' });
    }
    const review = new Review({ user, vendor, booking, rating, comment, status: 'pending' });
    await review.save();
    res.status(201).json({ message: 'Review submitted and pending admin approval!', review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all reviews for a vendor (only approved)
export const getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const reviews = await Review.find({ vendor: vendorId, status: 'approved' })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a review (user can only update their own review)
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const user = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    if (String(review.user) !== String(user)) {
      return res.status(403).json({ message: 'You can only update your own review.' });
    }
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    await review.save();
    res.json({ message: 'Review updated successfully.', review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a review (user can only delete their own review)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const user = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    if (String(review.user) !== String(user)) {
      return res.status(403).json({ message: 'You can only delete your own review.' });
    }
    await review.deleteOne();
    res.json({ message: 'Review deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get review stats for multiple vendors
export const getVendorsReviewStats = async (req, res) => {
  try {
    const vendorIds = req.query.vendorIds?.split(',') || [];
    if (!vendorIds.length) return res.status(400).json({ message: 'No vendorIds provided' });
    // Aggregate average rating and count for each vendor
    const stats = await Review.aggregate([
      { $match: { vendor: { $in: vendorIds.map(id => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id)) } } },
      { $group: {
        _id: '$vendor',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      } }
    ]);
    // Map to vendorId keys
    const result = {};
    stats.forEach(s => {
      result[s._id.toString()] = {
        avgRating: s.avgRating ? Number(s.avgRating.toFixed(1)) : 0,
        reviewCount: s.reviewCount
      };
    });
    // Fill missing vendors with 0s
    vendorIds.forEach(id => {
      if (!result[id]) result[id] = { avgRating: 0, reviewCount: 0 };
    });
    res.json({ stats: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Report a review (user)
export const reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    const user = req.user._id;
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    // Only allow reporting if not already reported
    if (review.reported) return res.status(400).json({ message: 'Review already reported.' });
    review.reported = true;
    review.reportReason = reason || 'Inappropriate content';
    review.reportedAt = new Date();
    await review.save();
    res.json({ message: 'Review reported for moderation.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Get all reported reviews
export const getReportedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reported: true })
      .populate('user', 'name profilePhoto')
      .populate('vendor', 'businessName');
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Approve (unflag) a review
export const approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    review.reported = false;
    review.reportReason = undefined;
    review.reportedAt = undefined;
    review.status = 'approved';
    review.adminHoldReason = undefined;
    await review.save();
    res.json({ message: 'Review approved and unflagged.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Remove (hold) a review (require reason, do not delete)
export const holdReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required.' });
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    review.status = 'on_hold';
    review.adminHoldReason = reason;
    await review.save();
    res.json({ message: 'Review put on hold with reason.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Delete any review
export const adminDeleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    await review.deleteOne();
    res.json({ message: 'Review deleted by admin.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Get all reviews
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name profilePhoto')
      .populate('vendor', 'businessName');
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
