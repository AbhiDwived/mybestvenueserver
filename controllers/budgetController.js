import Budget from '../models/Budget.js';

// Get budget for a user
export const getUserBudget = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find budget for the user or create a new one if it doesn't exist
    let budget = await Budget.findOne({ user: userId });

    if (!budget) {
      // Return empty budget if none exists yet (first time user)
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          totalPlanned: 0,
          totalActual: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Add a budget item
export const addBudgetItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, planned } = req.body;

    // Validate required fields and positive planned amount
    if (!category || !planned || planned <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Category and planned amount are required',
      });
    }

    // Find budget for the user or create a new one
    let budget = await Budget.findOne({ user: userId });

    if (!budget) {
      // Create new budget document if not found
      budget = new Budget({
        user: userId,
        items: [],
        totalPlanned: 0,
        totalActual: 0,
      });
    }

    // Add new budget item
    const newItem = {
      category,
      planned: Number(planned),
      actual: 0,
    };

    budget.items.push(newItem);

    // Update totals after adding new item
    budget.totalPlanned = budget.items.reduce((sum, item) => sum + item.planned, 0);
    budget.totalActual = budget.items.reduce((sum, item) => sum + item.actual, 0);

    await budget.save();

    res.status(201).json({
      success: true,
      data: budget,
      message: 'Budget item added successfully',
    });
  } catch (error) {
    console.error('Error adding budget item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Update a budget item
export const updateBudgetItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { category, planned, actual } = req.body;

    // Find budget for the user
    let budget = await Budget.findOne({ user: userId });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    // Find the specific item by its ObjectId
    const itemIndex = budget.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Budget item not found',
      });
    }

    // Update only provided fields
    if (category) budget.items[itemIndex].category = category;
    if (planned !== undefined) budget.items[itemIndex].planned = Number(planned);
    if (actual !== undefined) budget.items[itemIndex].actual = Number(actual);

    // Update totals after item update
    budget.totalPlanned = budget.items.reduce((sum, item) => sum + item.planned, 0);
    budget.totalActual = budget.items.reduce((sum, item) => sum + item.actual, 0);

    await budget.save();

    res.status(200).json({
      success: true,
      data: budget,
      message: 'Budget item updated successfully',
    });
  } catch (error) {
    console.error('Error updating budget item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Delete a budget item
export const deleteBudgetItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    // Find budget for the user
    let budget = await Budget.findOne({ user: userId });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    // Find and remove the specific item by its ObjectId
    const itemIndex = budget.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Budget item not found',
      });
    }

    // Remove the item from the array
    budget.items.splice(itemIndex, 1);

    // Update totals after deletion
    budget.totalPlanned = budget.items.reduce((sum, item) => sum + item.planned, 0);
    budget.totalActual = budget.items.reduce((sum, item) => sum + item.actual, 0);

    await budget.save();

    res.status(200).json({
      success: true,
      data: budget,
      message: 'Budget item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting budget item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
