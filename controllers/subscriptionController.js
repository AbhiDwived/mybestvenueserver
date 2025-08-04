import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';

// Create a new subscription (user or vendor)
export const createSubscription = async (req, res) => {
  try {
    const { planId, startDate, endDate, paymentInfo } = req.body;
    const userId = req.user.id;

    //  Check if user already has an active subscription for this plan
    const existing = await Subscription.findOne({
      user: userId,
      planId,
      status: 'active'
    });
    if (existing) {
      return res.status(400).json({ message: 'Already subscribed to this plan.' });
    }

    // Create new subscription
    const subscription = new Subscription({
      user: userId,
      planId,
      startDate,
      endDate,
      paymentInfo,
      status: 'active'
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
};

// Get all subscriptions for a user
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    //  Fetch all subscriptions for the user, newest first
    const subscriptions = await Subscription.find({ user: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
};

// Cancel a subscription
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.params;

    //  Only allow cancel if subscription belongs to user and is active
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found'
      });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message
    });
  }
};

// Admin: Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    //  Only admin can access all subscriptions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can view all subscriptions.'
      });
    }

    const subscriptions = await Subscription.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions
    });
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching all subscriptions',
      error: error.message
    });
  }
};