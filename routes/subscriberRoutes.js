import express from 'express';
import subscriberController from '../controllers/subscriberController.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/subscribe', subscriberController.subscribe);
router.post('/unsubscribe', subscriberController.unsubscribe);

// Admin routes
router.get('/all', VerifyAdmin, subscriberController.getAllSubscribers);
router.patch('/:id/status', VerifyAdmin, subscriberController.updateStatus);
router.delete('/:id', VerifyAdmin, subscriberController.deleteSubscriber);

export default router; 