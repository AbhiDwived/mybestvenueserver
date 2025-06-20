import Checklist from '../models/Checklist.js';
import mongoose from 'mongoose';

// Get user's checklist
export const getUserChecklist = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find checklist for the user or create a new one if it doesn't exist
    let checklist = await Checklist.findOne({ user: userId });

    if (!checklist) {
      // Return empty checklist if none exists yet
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          completedCount: 0,
          totalCount: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: checklist,
    });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Add a task to checklist
export const addChecklistTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { task } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        message: 'Task description is required',
      });
    }

    // Find checklist for the user or create a new one
    let checklist = await Checklist.findOne({ user: userId });

    if (!checklist) {
      checklist = new Checklist({
        user: userId,
        items: [],
        completedCount: 0,
        totalCount: 0,
      });
    }

    // Add new task
    const newTask = {
      task,
      completed: false,
      createdAt: new Date(),
    };

    checklist.items.push(newTask);
    checklist.totalCount = checklist.items.length;

    await checklist.save();

    res.status(201).json({
      success: true,
      data: checklist,
      message: 'Task added successfully',
    });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Toggle task completion status
export const toggleTaskCompletion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
      });
    }

    // Find user's checklist
    const checklist = await Checklist.findOne({ user: userId });

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Checklist not found',
      });
    }

    // Find the specific task
    const taskIndex = checklist.items.findIndex(item => item._id.toString() === taskId);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Toggle completion status
    checklist.items[taskIndex].completed = !checklist.items[taskIndex].completed;
    
    // Update completed count
    checklist.completedCount = checklist.items.filter(item => item.completed).length;

    await checklist.save();

    res.status(200).json({
      success: true,
      data: checklist,
      message: 'Task status updated successfully',
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Delete a task
export const deleteChecklistTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
      });
    }

    // Find user's checklist
    const checklist = await Checklist.findOne({ user: userId });

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Checklist not found',
      });
    }

    // Find the specific task
    const taskIndex = checklist.items.findIndex(item => item._id.toString() === taskId);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Remove the task
    const wasCompleted = checklist.items[taskIndex].completed;
    checklist.items.splice(taskIndex, 1);
    
    // Update counts
    checklist.totalCount = checklist.items.length;
    if (wasCompleted) {
      checklist.completedCount -= 1;
    }

    await checklist.save();

    res.status(200).json({
      success: true,
      data: checklist,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
