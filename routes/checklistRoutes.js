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
//  Only authenticated users can access or modify their checklist

//  Get the full checklist for the logged-in user
router.get('/', VerifyUser, getUserChecklist);

//  Add a new task to the user's checklist
router.post('/task', VerifyUser, addChecklistTask);

//  Toggle completion status of a specific task (user must own it)
router.put('/task/:taskId/toggle', VerifyUser, toggleTaskCompletion);

//  Delete a specific task from the user's checklist (user must own it)
router.delete('/task/:taskId', VerifyUser, deleteChecklistTask);

export default router;