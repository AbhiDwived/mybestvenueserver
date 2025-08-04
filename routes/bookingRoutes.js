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
//  Only admins can fetch all bookings in the system
router.get('/all', VerifyAdmin, getAllBookings);

// User routes
//  Authenticated users can manage their own bookings
router.get('/', VerifyUser, getUserBookings); //  Get all bookings for the logged-in user
router.get('/vendors', VerifyUser, getAvailableVendors); //  Get available vendors for booking (filtered)
router.get('/:bookingId', VerifyUser, getBookingById); //  Get a specific booking by its ID (user must own it)
router.post('/', VerifyUser, createBooking); //  Create a new booking (user only)
router.put('/:bookingId', VerifyUser, updateBooking); //  Update a booking (user must own it)
router.delete('/:bookingId', VerifyUser, deleteBooking); //  Delete a booking (user must own it)

// Vendor routes
//  Vendors (or admins) can view and update bookings for their vendor account
router.get("/getvendorBookings/:vendorId", VerifyAdminOrVendor, getVendorBookings); //  Get all bookings for a specific vendor (admin or vendor only)
router.put("/updateVendorBooking/:bookingId", VerifyAdminOrVendor, updateVendorBooking); //  Update booking status/details as vendor or admin

export default router;
