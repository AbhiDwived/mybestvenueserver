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
//  Only authenticated users can access or modify their guest list

//  Get the full guest list for the logged-in user
router.get('/', VerifyUser, getUserGuests);

//  Add a new guest to the user's guest list
router.post('/', VerifyUser, addGuest);

//  Update a specific guest's details by guestId (user must own it)
router.put('/:guestId', VerifyUser, updateGuest);

//  Update a guest's RSVP/status (e.g., attending, declined)
router.patch('/:guestId/status', VerifyUser, updateGuestStatus);

//  Delete a specific guest from the user's guest list
router.delete('/:guestId', VerifyUser, deleteGuest);

export default router;