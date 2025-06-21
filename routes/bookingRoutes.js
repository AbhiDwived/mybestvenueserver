import express from 'express';
import {
  getUserBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getAvailableVendors,
  getVendorBookings,
  
} from '../controllers/bookingController.js';
import { VerifyUser, VerifyVendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected with VerifyUser middleware
router.get('/', VerifyUser, getUserBookings);
router.get('/vendors', VerifyUser, getAvailableVendors);
router.get('/:bookingId', VerifyUser, getBookingById);
router.post('/', VerifyUser, createBooking);
router.put('/:bookingId', VerifyUser, updateBooking);
router.delete('/:bookingId', VerifyUser, deleteBooking);



// vendor Routes

router.get("/getvendorBookings/:vendorId",VerifyVendor, getVendorBookings);


export default router; 