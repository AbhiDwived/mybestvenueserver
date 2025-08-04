// /server/routes/categoryRoutes.js
import express from 'express';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
} from '../controllers/categoryController.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public route
// Deep comment: Vendors & users can fetch all categories for filtering or listing
router.get('/categories', getCategories);

// Admin-only routes
// Deep comment: Only admins can create a new category
router.post('/categories', VerifyAdmin, createCategory);

// Deep comment: Only admins can update a category by its ID
router.put('/categories/:categoryId', VerifyAdmin, updateCategory);

// Deep comment: Only admins can delete a category by its ID
router.delete('/categories/:categoryId', VerifyAdmin, deleteCategory);

export default router;
