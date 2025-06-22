import Subscriber from '../models/Subscriber.js';
import { sendEmail } from '../utils/sendEmail.js';

const subscriberController = {
  // Subscribe a new email
  subscribe: async (req, res) => {
    try {
      const { email } = req.body;

      // Check if email already exists
      const existingSubscriber = await Subscriber.findOne({ email });
      if (existingSubscriber) {
        if (existingSubscriber.isActive) {
          return res.status(400).json({ message: 'Email already subscribed' });
        } else {
          // Reactivate subscription
          existingSubscriber.isActive = true;
          await existingSubscriber.save();
          return res.status(200).json({ message: 'Subscription reactivated successfully' });
        }
      }

      // Create new subscriber
      const newSubscriber = new Subscriber({ email });
      await newSubscriber.save();

      // Send welcome email
      try {
        await sendEmail({
          email,
          subject: 'Welcome to MyBestVenue Newsletter!',
          message: `Thank you for subscribing to MyBestVenue newsletter! You'll now receive updates about latest venues, event trends, and special offers.
          
If you wish to unsubscribe in the future, please click here: [Unsubscribe Link]`
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue execution even if email fails
      }

      res.status(201).json({ 
        message: 'Subscribed successfully',
        subscriber: newSubscriber 
      });
    } catch (error) {
      console.error('Subscription error:', error);
      res.status(500).json({ 
        message: 'Error processing subscription',
        error: error.message 
      });
    }
  },

  // Unsubscribe an email
  unsubscribe: async (req, res) => {
    try {
      const { email } = req.body;

      const subscriber = await Subscriber.findOne({ email });
      if (!subscriber || !subscriber.isActive) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      subscriber.isActive = false;
      await subscriber.save();

      res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({ 
        message: 'Error processing unsubscribe request',
        error: error.message 
      });
    }
  },

  // Get all subscribers (admin only)
  getAllSubscribers: async (req, res) => {
    try {
      const subscribers = await Subscriber.find({}) // Remove isActive filter to get all subscribers
        .select('email createdAt isActive')
        .sort('-createdAt');

      res.status(200).json({
        count: subscribers.length,
        subscribers
      });
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      res.status(500).json({ 
        message: 'Error fetching subscribers',
        error: error.message 
      });
    }
  },

  // Update subscriber status (admin only)
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const subscriber = await Subscriber.findById(id);
      if (!subscriber) {
        return res.status(404).json({ message: 'Subscriber not found' });
      }

      // Only update the isActive status
      subscriber.isActive = isActive;
      await subscriber.save();

      // Send email notification for status change
      try {
        if (!isActive) {
          await sendEmail({
            email: subscriber.email,
            subject: 'Newsletter Subscription Deactivated',
            message: `Your subscription to MyBestVenue newsletter has been deactivated. If you'd like to reactivate your subscription, please visit our website.`
          });
        } else {
          await sendEmail({
            email: subscriber.email,
            subject: 'Newsletter Subscription Reactivated',
            message: `Your subscription to MyBestVenue newsletter has been reactivated. You'll now receive our latest updates and offers.`
          });
        }
      } catch (emailError) {
        console.error('Error sending status change email:', emailError);
        // Continue execution even if email fails
      }

      res.status(200).json({
        message: `Subscriber ${isActive ? 'activated' : 'deactivated'} successfully`,
        subscriber
      });
    } catch (error) {
      console.error('Error updating subscriber status:', error);
      res.status(500).json({
        message: 'Error updating subscriber status',
        error: error.message
      });
    }
  },

  // Delete subscriber (admin only)
  deleteSubscriber: async (req, res) => {
    try {
      const { id } = req.params;

      const subscriber = await Subscriber.findById(id);
      if (!subscriber) {
        return res.status(404).json({ message: 'Subscriber not found' });
      }

      // Send notification email before deletion
      try {
        await sendEmail({
          email: subscriber.email,
          subject: 'Newsletter Subscription Removed',
          message: `Your subscription to MyBestVenue newsletter has been removed. If you'd like to subscribe again in the future, please visit our website.`
        });
      } catch (emailError) {
        console.error('Error sending deletion notification:', emailError);
        // Continue execution even if email fails
      }

      await subscriber.deleteOne();

      res.status(200).json({
        message: 'Subscriber deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      res.status(500).json({
        message: 'Error deleting subscriber',
        error: error.message
      });
    }
  }
};

export default subscriberController; 