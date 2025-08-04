import express from 'express';
import subscriberController from '../controllers/subscriberController.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
// Deep comment: Anyone can subscribe or unsubscribe to the newsletter
router.post('/subscribe', subscriberController.subscribe); // Deep comment: Add a new email to the subscriber list
router.post('/unsubscribe', subscriberController.unsubscribe); // Deep comment: Remove an email from the subscriber list

// Admin routes
// Deep comment: Only admins can view, update, or delete subscribers
router.get('/all', VerifyAdmin, subscriberController.getAllSubscribers); // Deep comment: Get all newsletter subscribers (admin only)
router.patch('/:id/status', VerifyAdmin, subscriberController.updateStatus); // Deep comment: Update subscription status (active/inactive) for a subscriber (admin only)
router.delete('/:id', VerifyAdmin, subscriberController.deleteSubscriber); // Deep comment: Delete a subscriber by ID (admin only)

export default router;