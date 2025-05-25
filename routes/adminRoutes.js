import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  updateAdminProfile,
  approveVendor,
  verifyAdminOtp,
  resendAdminOtp,
  deleteVendorByAdmin,
} from '../controllers/adminController.js';

import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerAdmin);

router.post('/login', loginAdmin);

// Verify vendor OTP
router.post('/admin_verify_otp', verifyAdminOtp);

// Resend OTP to vendor
router.post('/resend_admin_otp', resendAdminOtp);

router.put('/update/:adminId', VerifyAdmin, updateAdminProfile);

router.put('/approve/:vendorId', VerifyAdmin, approveVendor);

router.delete('/delete-vendor/:vendorId', VerifyAdmin, deleteVendorByAdmin);

export default router;
