import express from 'express';
import { validate, inquiryValidation } from '../middlewares/validation.js';
import {
  createInquiry,
  createAnonymousInquiry,
  getVendorInquiries,
  replyToInquiry
} from '../controllers/inquiryController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { checkRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Create new inquiry (logged-in users)
router.post('/', verifyToken, validate(inquiryValidation.create), createInquiry);

// Create anonymous inquiry (no login required)
router.post('/anonymous', createAnonymousInquiry);

// Get vendor inquiries (vendor only)
router.get('/vendor/:vendorId', verifyToken, checkRole(['vendor']), getVendorInquiries);

// Reply to inquiry (vendor only)
router.post('/reply', verifyToken, checkRole(['vendor']), replyToInquiry);

export default router;
