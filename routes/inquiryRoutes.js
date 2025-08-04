import express from 'express';
import { validate, inquiryValidation } from '../middlewares/validation.js';
import {
  createInquiry,
  createAnonymousInquiry,
  getVendorInquiries,
  replyToInquiry,
  getAnonymousInquiries
} from '../controllers/inquiryController.js';
import { verifyToken, VerifyAdminOrVendor } from '../middlewares/authMiddleware.js';
import { verifyRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Create new inquiry (logged-in users)
// Deep comment: Only authenticated users can create an inquiry for a vendor
router.post('/', verifyToken, validate(inquiryValidation.create), createInquiry);

// Create anonymous inquiry (no login required)
// Deep comment: Allow anyone (no login) to submit an inquiry to a vendor
router.post('/anonymous', createAnonymousInquiry);

// Get vendor inquiries (vendor only)
// Deep comment: Only vendors or admins can fetch all inquiries for a specific vendor
router.get('/vendor/:vendorId', VerifyAdminOrVendor, getVendorInquiries);

// Reply to inquiry (vendor only)
// Deep comment: Only vendors or admins can reply to an inquiry
router.post('/reply', VerifyAdminOrVendor, replyToInquiry);

// Get all anonymous inquiries for a vendor
// Deep comment: Only vendors or admins can fetch all anonymous inquiries for a specific vendor
router.get('/anonymous/:vendorId', VerifyAdminOrVendor, getAnonymousInquiries);

export default router;
