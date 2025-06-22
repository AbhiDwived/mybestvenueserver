import express from 'express';
import { validate, inquiryValidation } from '../middlewares/validation.js';
import {
  createInquiry,
  // ... other imports
} from '../controllers/inquiryController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create new inquiry
router.post('/', verifyToken, validate(inquiryValidation.create), createInquiry);

// ... other routes

export default router;
