import express from 'express';
import { createReview, getVendorReviews, updateReview, deleteReview } from '../controllers/reviewController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createReview);
router.get('/vendor/:vendorId', getVendorReviews);
router.put('/:reviewId', verifyToken, updateReview);
router.delete('/:reviewId', verifyToken, deleteReview);

export default router;
