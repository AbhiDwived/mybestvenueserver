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
router.get('/all', VerifyAdmin, getAllBookings);

// User routes
router.get('/', VerifyUser, getUserBookings);
router.get('/vendors', VerifyUser, getAvailableVendors);
router.get('/:bookingId', VerifyUser, getBookingById);
router.post('/', VerifyUser, createBooking);
router.put('/:bookingId', VerifyUser, updateBooking);
router.delete('/:bookingId', VerifyUser, deleteBooking);

// Vendor routes
router.get("/getvendorBookings/:vendorId", VerifyAdminOrVendor, getVendorBookings);
router.put("/updateVendorBooking/:bookingId", VerifyAdminOrVendor, updateVendorBooking);

export default router;
