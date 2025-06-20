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
router.get('/', VerifyUser, getUserBudget);
router.post('/item', VerifyUser, addBudgetItem);
router.put('/item/:itemId', VerifyUser, updateBudgetItem);
router.delete('/item/:itemId', VerifyUser, deleteBudgetItem);

export default router; 