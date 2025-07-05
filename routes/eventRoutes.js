import express from 'express';
import {
  createEvent,
  getVendorEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventsByDateRange,
  getUpcomingEvents
} from '../controllers/eventController.js';
import { VerifyVendor } from '../middlewares/authMiddleware.js';
import { verifyRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// All routes require authentication and vendor role
router.use(VerifyVendor);
router.use(verifyRole(['vendor']));

// Create a new event
router.post('/:vendorId', createEvent);

// Get all events for a vendor
router.get('/:vendorId', getVendorEvents);

// Get upcoming events
router.get('/:vendorId/upcoming', getUpcomingEvents);

// Get events by date range
router.get('/:vendorId/range', getEventsByDateRange);

// Get a single event
router.get('/:vendorId/:eventId', getEventById);

// Update an event
router.put('/:vendorId/:eventId', updateEvent);

// Delete an event
router.delete('/:vendorId/:eventId', deleteEvent);

export default router; 