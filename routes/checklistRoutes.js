import express from 'express';
import {
  getUserChecklist,
  addChecklistTask,
  toggleTaskCompletion,
  deleteChecklistTask
} from '../controllers/checklistController.js';
import { VerifyUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected with VerifyUser middleware
router.get('/', VerifyUser, getUserChecklist);
router.post('/task', VerifyUser, addChecklistTask);
router.put('/task/:taskId/toggle', VerifyUser, toggleTaskCompletion);
router.delete('/task/:taskId', VerifyUser, deleteChecklistTask);

export default router; 