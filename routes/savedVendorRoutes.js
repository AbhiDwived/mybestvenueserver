import express from 'express';
import {
  getSavedVendors,
  saveVendor,
  unsaveVendor,
  checkVendorSaved,
} from '../controllers/savedVendorController.js';
import { VerifyUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected with VerifyUser middleware
router.get('/', VerifyUser, getSavedVendors);
router.post('/:vendorId', VerifyUser, saveVendor);
router.delete('/:vendorId', VerifyUser, unsaveVendor);
router.get('/check/:vendorId', VerifyUser, checkVendorSaved);

export default router; 