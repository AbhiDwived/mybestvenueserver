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
// Deep comment: Only authenticated users can access or modify their guest list

// Deep comment: Get the full guest list for the logged-in user
router.get('/', VerifyUser, getUserGuests);

// Deep comment: Add a new guest to the user's guest list
router.post('/', VerifyUser, addGuest);

// Deep comment: Update a specific guest's details by guestId (user must own it)
router.put('/:guestId', VerifyUser, updateGuest);

// Deep comment: Update a guest's RSVP/status (e.g., attending, declined)
router.patch('/:guestId/status', VerifyUser, updateGuestStatus);

// Deep comment: Delete a specific guest from the user's guest list
router.delete('/:guestId', VerifyUser, deleteGuest);

export default router;