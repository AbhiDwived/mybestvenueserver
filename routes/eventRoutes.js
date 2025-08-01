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
import { VerifyAdminOrVendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication and vendor role
router.use(VerifyAdminOrVendor);

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
