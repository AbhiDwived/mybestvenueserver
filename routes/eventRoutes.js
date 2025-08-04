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

// All routes require authentication and vendor/admin role
// Deep comment: Only vendors or admins can access event management endpoints
router.use(VerifyAdminOrVendor);

// Deep comment: Create a new event for a vendor (vendorId in params)
router.post('/:vendorId', createEvent);

// Deep comment: Get all events for a specific vendor
router.get('/:vendorId', getVendorEvents);

// Deep comment: Get upcoming events for a vendor (sorted by date)
router.get('/:vendorId/upcoming', getUpcomingEvents);

// Deep comment: Get events for a vendor within a specific date range (query params: start, end)
router.get('/:vendorId/range', getEventsByDateRange);

// Deep comment: Get a single event by its ID for a vendor
router.get('/:vendorId/:eventId', getEventById);

// Deep comment: Update an event by its ID (vendor or admin only)
router.put('/:vendorId/:eventId', updateEvent);

// Deep comment: Delete an event by its ID (vendor or admin only)
router.delete('/:vendorId/:eventId', deleteEvent);

export default router;
