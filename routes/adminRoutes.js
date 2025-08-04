import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  updateAdminProfile,
  getAllVendors,
  getPendingVendors,
  approveVendor,
  verifyAdminOtp,
  resendAdminOtp,
  deleteVendorByAdmin,
  getAllUsers,
  deleteUserByAdmin,
  getVendorCountsByLocation,
  getLatestVendorsByType,
  refreshToken,
  getAllRides,
  createRideByAdmin,
  updateRideByAdmin,
  deleteRideByAdmin,
  getRidesByVendor
} from '../controllers/adminController.js';
import { createVendorByAdmin } from '../controllers/vendorController.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Admin registration and login
router.post('/register', registerAdmin); //  Register a new admin (OTP sent to email)
router.post('/login', loginAdmin); //  Admin login, returns JWT if successful

// OTP verification for admin
router.post('/admin_verify_otp', verifyAdminOtp); //  Verify OTP for admin registration
router.post('/resend_admin_otp', resendAdminOtp); //  Resend OTP for admin registration

// Admin profile update (protected)
router.put('/update/:adminId', VerifyAdmin, updateAdminProfile); //  Update admin profile (only self, protected)

// Vendor management routes (admin only)
router.get('/all_vendors', getAllVendors); //  Get all vendors (public or admin dashboard)
router.get('/latest_vendors_by_type', getLatestVendorsByType); //  Get latest vendors grouped by type
router.get('/pending_vendor', VerifyAdmin, getPendingVendors); //  Get all vendors pending approval (admin only)
router.put('/approve/:vendorId', VerifyAdmin, approveVendor); //  Approve a vendor by ID (admin only)
router.delete('/delete-vendor/:vendorId', VerifyAdmin, deleteVendorByAdmin); //  Delete a vendor by ID (admin only)
router.post('/create-vendor', VerifyAdmin, upload.single('profilePicture'), createVendorByAdmin); //  Admin creates a new vendor with profile picture

// User management routes (admin only)
router.get('/all_users', VerifyAdmin, getAllUsers); //  Get all users (admin only)
router.delete('/delete-user/:userId', VerifyAdmin, deleteUserByAdmin); //  Delete a user by ID (admin only)

// Vendor statistics
router.get('/vendor-counts/:location', getVendorCountsByLocation); //  Get vendor counts by location (for analytics)

// Token refresh
router.post("/refresh-token", refreshToken); //  Refresh admin JWT token

// Ride management routes (admin only)
router.get('/rides', VerifyAdmin, getAllRides); //  Get all rides (admin only)
router.post('/rides', VerifyAdmin, createRideByAdmin); //  Create a new ride (admin only)
router.put('/rides/:rideId', VerifyAdmin, updateRideByAdmin); //  Update ride details by rideId (admin only)
router.delete('/rides/:rideId', VerifyAdmin, deleteRideByAdmin); //  Delete a ride by rideId (admin only)
router.get('/rides/vendor/:vendorId', VerifyAdmin, getRidesByVendor); //  Get all rides for a specific vendor (admin only)

export default router;
