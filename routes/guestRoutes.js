import express from 'express';
import {
  getUserGuests,
  addGuest,
  updateGuest,
  updateGuestStatus,
  deleteGuest
} from '../controllers/guestController.js';
import { VerifyUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected with VerifyUser middleware
router.get('/', VerifyUser, getUserGuests);
router.post('/', VerifyUser, addGuest);
router.put('/:guestId', VerifyUser, updateGuest);
router.patch('/:guestId/status', VerifyUser, updateGuestStatus);
router.delete('/:guestId', VerifyUser, deleteGuest);

export default router; 