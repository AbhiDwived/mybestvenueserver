// /server/routes/venueRoutes.js
import express from 'express';
import {
  createVenue,
  getApprovedVenues,
  getVenueById,
  approveVenue,
} from '../controllers/venueController.js';

import { VerifyVendor, VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public
router.get('/', getApprovedVenues);
router.get('/:venueId', getVenueById);

// Vendor - Create a new venue (pending approval)
router.post('/', VerifyVendor, createVenue);

// Admin - Approve venue
router.put('/approve/:venueId', VerifyAdmin, approveVenue);

export default router;
