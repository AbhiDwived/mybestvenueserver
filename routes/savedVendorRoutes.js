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
//  Only authenticated users can manage their saved vendors

//  Get all vendors saved by the logged-in user
router.get('/', VerifyUser, getSavedVendors);

//  Save a vendor to the user's saved list (user must be logged in)
router.post('/:vendorId', VerifyUser, saveVendor);

//  Remove a vendor from the user's saved list (user must be logged in)
router.delete('/:vendorId', VerifyUser, unsaveVendor);

//  Check if a specific vendor is saved by the user (returns true/false)
router.get('/check/:vendorId', VerifyUser, checkVendorSaved);

export default router;