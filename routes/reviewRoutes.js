import express from 'express';
import { createReview, getVendorReviews, updateReview, deleteReview, getVendorsReviewStats, reportReview, getReportedReviews, approveReview, adminDeleteReview, getAllReviews, holdReview } from '../controllers/reviewController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createReview);
router.get('/vendor/:vendorId', getVendorReviews);
router.get('/stats', getVendorsReviewStats);
router.put('/:reviewId', verifyToken, updateReview);
router.patch('/:reviewId/report', verifyToken, reportReview);
router.get('/reported', VerifyAdmin, getReportedReviews);
router.patch('/:reviewId/approve', VerifyAdmin, approveReview);
router.patch('/:reviewId/hold', VerifyAdmin, holdReview);
router.delete('/:reviewId', verifyToken, deleteReview); // user delete
router.delete('/admin/:reviewId', VerifyAdmin, adminDeleteReview); // admin delete
router.get('/all', VerifyAdmin, getAllReviews);

export default router;
