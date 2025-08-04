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
router.post('/register', registerAdmin); // Deep comment: Register a new admin (OTP sent to email)
router.post('/login', loginAdmin); // Deep comment: Admin login, returns JWT if successful

// OTP verification for admin
router.post('/admin_verify_otp', verifyAdminOtp); // Deep comment: Verify OTP for admin registration
router.post('/resend_admin_otp', resendAdminOtp); // Deep comment: Resend OTP for admin registration

// Admin profile update (protected)
router.put('/update/:adminId', VerifyAdmin, updateAdminProfile); // Deep comment: Update admin profile (only self, protected)

// Vendor management routes (admin only)
router.get('/all_vendors', getAllVendors); // Deep comment: Get all vendors (public or admin dashboard)
router.get('/latest_vendors_by_type', getLatestVendorsByType); // Deep comment: Get latest vendors grouped by type
router.get('/pending_vendor', VerifyAdmin, getPendingVendors); // Deep comment: Get all vendors pending approval (admin only)
router.put('/approve/:vendorId', VerifyAdmin, approveVendor); // Deep comment: Approve a vendor by ID (admin only)
router.delete('/delete-vendor/:vendorId', VerifyAdmin, deleteVendorByAdmin); // Deep comment: Delete a vendor by ID (admin only)
router.post('/create-vendor', VerifyAdmin, upload.single('profilePicture'), createVendorByAdmin); // Deep comment: Admin creates a new vendor with profile picture

// User management routes (admin only)
router.get('/all_users', VerifyAdmin, getAllUsers); // Deep comment: Get all users (admin only)
router.delete('/delete-user/:userId', VerifyAdmin, deleteUserByAdmin); // Deep comment: Delete a user by ID (admin only)

// Vendor statistics
router.get('/vendor-counts/:location', getVendorCountsByLocation); // Deep comment: Get vendor counts by location (for analytics)

// Token refresh
router.post("/refresh-token", refreshToken); // Deep comment: Refresh admin JWT token

// Ride management routes (admin only)
router.get('/rides', VerifyAdmin, getAllRides); // Deep comment: Get all rides (admin only)
router.post('/rides', VerifyAdmin, createRideByAdmin); // Deep comment: Create a new ride (admin only)
router.put('/rides/:rideId', VerifyAdmin, updateRideByAdmin); // Deep comment: Update ride details by rideId (admin only)
router.delete('/rides/:rideId', VerifyAdmin, deleteRideByAdmin); // Deep comment: Delete a ride by rideId (admin only)
router.get('/rides/vendor/:vendorId', VerifyAdmin, getRidesByVendor); // Deep comment: Get all rides for a specific vendor (admin only)

export default router;
