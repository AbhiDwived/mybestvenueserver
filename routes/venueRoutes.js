// /server/routes/venueRoutes.js
import express from 'express';
import {
  createVenue,
  getApprovedVenues,
  getVenueById,
  approveVenue,
  getFilteredVenues,
} from '../controllers/venueController.js';

import { VerifyVendor, VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get all approved venues
router.get('/', getApprovedVenues);

// Get filtered venues with pagination and sorting
router.get('/filtered', getFilteredVenues);

// Get a specific venue by its ID
router.get('/:venueId', getVenueById);

// Create a new venue (requires vendor authentication)
router.post('/', VerifyVendor, createVenue);

// Approve a venue (requires admin authentication)
router.put('/approve/:venueId', VerifyAdmin, approveVenue);

export default router;
