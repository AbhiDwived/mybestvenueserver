import express from 'express';
import { validate, inquiryValidation } from '../middlewares/validation.js';
import {
  createInquiry,
  createAnonymousInquiry,
  getVendorInquiries,
  replyToInquiry,
  getAnonymousInquiries
} from '../controllers/inquiryController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { verifyRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Create new inquiry (logged-in users)
router.post('/', verifyToken, validate(inquiryValidation.create), createInquiry);

// Create anonymous inquiry (no login required)
router.post('/anonymous', createAnonymousInquiry);

// Get vendor inquiries (vendor only)
router.get('/vendor/:vendorId', verifyToken, verifyRole(['vendor']), getVendorInquiries);

// Reply to inquiry (vendor only)
router.post('/reply', verifyToken, verifyRole(['vendor']), replyToInquiry);

// Get all anonymous inquiries for a vendor
router.get('/anonymous/:vendorId', verifyToken, verifyRole(['vendor']), getAnonymousInquiries);

export default router;
