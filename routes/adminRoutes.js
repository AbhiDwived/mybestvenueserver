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

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Verify admin OTP
router.post('/admin_verify_otp', verifyAdminOtp);

// Resend admin OTP
router.post('/resend_admin_otp', resendAdminOtp);

router.put('/update/:adminId', VerifyAdmin, updateAdminProfile);

router.get('/all_vendors', getAllVendors);
router.get('/latest_vendors_by_type', getLatestVendorsByType);
router.get('/pending_vendor', VerifyAdmin, getPendingVendors);
router.put('/approve/:vendorId', VerifyAdmin, approveVendor);
router.delete('/delete-vendor/:vendorId', VerifyAdmin, deleteVendorByAdmin);
router.post('/create-vendor', VerifyAdmin, upload.single('profilePicture'), createVendorByAdmin);

router.get('/all_users', VerifyAdmin, getAllUsers);
router.delete('/delete-user/:userId', VerifyAdmin, deleteUserByAdmin);

// New route for vendor counts by location
router.get('/vendor-counts/:location', getVendorCountsByLocation);

router.post("/refresh-token", refreshToken);

// Ride management routes
router.get('/rides', VerifyAdmin, getAllRides);
router.post('/rides', VerifyAdmin, createRideByAdmin);
router.put('/rides/:rideId', VerifyAdmin, updateRideByAdmin);
router.delete('/rides/:rideId', VerifyAdmin, deleteRideByAdmin);
router.get('/rides/vendor/:vendorId', VerifyAdmin, getRidesByVendor);

export default router;
