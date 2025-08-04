import express from 'express';
import { validate, bookingValidation } from '../middlewares/validation.js';
import {
  getUserBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getAvailableVendors,
  getVendorBookings,
  updateVendorBooking,
  getAllBookings
} from '../controllers/bookingController.js';
import { VerifyUser, VerifyVendor, VerifyAdmin, VerifyAdminOrVendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin routes
// Deep comment: Only admins can fetch all bookings in the system
router.get('/all', VerifyAdmin, getAllBookings);

// User routes
// Deep comment: Authenticated users can manage their own bookings
router.get('/', VerifyUser, getUserBookings); // Deep comment: Get all bookings for the logged-in user
router.get('/vendors', VerifyUser, getAvailableVendors); // Deep comment: Get available vendors for booking (filtered)
router.get('/:bookingId', VerifyUser, getBookingById); // Deep comment: Get a specific booking by its ID (user must own it)
router.post('/', VerifyUser, createBooking); // Deep comment: Create a new booking (user only)
router.put('/:bookingId', VerifyUser, updateBooking); // Deep comment: Update a booking (user must own it)
router.delete('/:bookingId', VerifyUser, deleteBooking); // Deep comment: Delete a booking (user must own it)

// Vendor routes
// Deep comment: Vendors (or admins) can view and update bookings for their vendor account
router.get("/getvendorBookings/:vendorId", VerifyAdminOrVendor, getVendorBookings); // Deep comment: Get all bookings for a specific vendor (admin or vendor only)
router.put("/updateVendorBooking/:bookingId", VerifyAdminOrVendor, updateVendorBooking); // Deep comment: Update booking status/details as vendor or admin

export default router;
