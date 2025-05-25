// /server/routes/categoryRoutes.js
import express from 'express';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories, // ✅ Use the correct exported function
} from '../controllers/categoryController.js';


import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ✅ Public - Vendors & Users can use this to filter/list by category
router.get('/categories', getCategories);

// ✅ Admin-only - Create new category
router.post('/categories', VerifyAdmin, createCategory);

// ✅ Admin-only - Update category by ID
router.put('/categories/:categoryId', VerifyAdmin, updateCategory);

// ✅ Admin-only - Delete category by ID
router.delete('/categories/:categoryId', VerifyAdmin, deleteCategory);

export default router;
