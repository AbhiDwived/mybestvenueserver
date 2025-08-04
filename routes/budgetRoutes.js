import express from 'express';
import {
  getUserBudget,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem
} from '../controllers/budgetController.js';
import { VerifyUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected with VerifyUser middleware
// Deep comment: Only authenticated users can access or modify their budget

// Deep comment: Get the full budget for the logged-in user
router.get('/', VerifyUser, getUserBudget);

// Deep comment: Add a new budget item for the logged-in user
router.post('/item', VerifyUser, addBudgetItem);

// Deep comment: Update a specific budget item by its ID (user must own it)
router.put('/item/:itemId', VerifyUser, updateBudgetItem);

// Deep comment: Delete a specific budget item by its ID (user must own it)
router.delete('/item/:itemId', VerifyUser, deleteBudgetItem);

export default router;