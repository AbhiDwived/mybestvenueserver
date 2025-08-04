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
//  Only authenticated users can access or modify their budget

//  Get the full budget for the logged-in user
router.get('/', VerifyUser, getUserBudget);

//  Add a new budget item for the logged-in user
router.post('/item', VerifyUser, addBudgetItem);

//  Update a specific budget item by its ID (user must own it)
router.put('/item/:itemId', VerifyUser, updateBudgetItem);

//  Delete a specific budget item by its ID (user must own it)
router.delete('/item/:itemId', VerifyUser, deleteBudgetItem);

export default router;