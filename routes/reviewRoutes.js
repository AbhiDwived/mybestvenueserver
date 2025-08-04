import express from 'express';
import {
  createReview,
  getVendorReviews,
  updateReview,
  deleteReview,
  getVendorsReviewStats,
  reportReview,
  getReportedReviews,
  approveReview,
  adminDeleteReview,
  getAllReviews,
  holdReview
} from '../controllers/reviewController.js';
import { verifyToken, VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
// Deep comment: Anyone can fetch vendor reviews and review stats
router.get('/vendor/:vendorId', getVendorReviews); // Deep comment: Get all reviews for a specific vendor (public)
router.get('/stats', getVendorsReviewStats); // Deep comment: Get review statistics for all vendors (public)

// User routes (requires authentication)
// Deep comment: Only authenticated users can create, update, report, or delete their reviews
router.post('/', verifyToken, createReview); // Deep comment: Create a new review for a vendor (user only)
router.put('/:reviewId', verifyToken, updateReview); // Deep comment: Update a review by its ID (user must own it)
router.patch('/:reviewId/report', verifyToken, reportReview); // Deep comment: Report a review as inappropriate (user only)
router.delete('/:reviewId', verifyToken, deleteReview); // Deep comment: Delete a review by its ID (user must own it)

// Admin routes (requires admin authentication)
// Deep comment: Only admins can view, approve, hold, or delete any review
router.get('/reported', VerifyAdmin, getReportedReviews); // Deep comment: Get all reported reviews (admin only)
router.patch('/:reviewId/approve', VerifyAdmin, approveReview); // Deep comment: Approve a reported review (admin only)
router.patch('/:reviewId/hold', VerifyAdmin, holdReview); // Deep comment: Put a review on hold (admin only)
router.delete('/admin/:reviewId', VerifyAdmin, adminDeleteReview); // Deep comment: Admin deletes any review by its ID
router.get('/all', VerifyAdmin, getAllReviews); // Deep comment: Get all reviews in the system (admin only)

export default router;
