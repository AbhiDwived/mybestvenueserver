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
//  Only vendors or admins can access event management endpoints
router.use(VerifyAdminOrVendor);

//  Create a new event for a vendor (vendorId in params)
router.post('/:vendorId', createEvent);

//  Get all events for a specific vendor
router.get('/:vendorId', getVendorEvents);

//  Get upcoming events for a vendor (sorted by date)
router.get('/:vendorId/upcoming', getUpcomingEvents);

//  Get events for a vendor within a specific date range (query params: start, end)
router.get('/:vendorId/range', getEventsByDateRange);

//  Get a single event by its ID for a vendor
router.get('/:vendorId/:eventId', getEventById);

//  Update an event by its ID (vendor or admin only)
router.put('/:vendorId/:eventId', updateEvent);

//  Delete an event by its ID (vendor or admin only)
router.delete('/:vendorId/:eventId', deleteEvent);

export default router;
