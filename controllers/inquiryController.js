import Inquiry from '../models/Inquiry.js';
import AnonymousInquiry from '../models/AnonymousInquiry.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { logInquirySent } from '../utils/activityLogger.js';

// Create a new inquiry for logged-in users
export const createInquiry = async (req, res) => {
  try {
    const { vendorId, message, type } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const inquiry = new Inquiry({
      user: userId,
      vendor: vendorId,
      message,
      type
    });

    await inquiry.save();

    // Log the activity
    await logInquirySent(user, vendor, inquiry, req);

    res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully',
      inquiry
    });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inquiry',
      error: error.message
    });
  }
};

// Create anonymous inquiry (no login required)
export const createAnonymousInquiry = async (req, res) => {
  try {
    const { vendorId, name, email, phone, weddingDate, message } = req.body;

    // Validate required fields
    if (!vendorId || !name || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ 
        success: false,
        message: 'Vendor not found' 
      });
    }

    const anonymousInquiry = new AnonymousInquiry({
      vendorId,
      name,
      email,
      phone,
      weddingDate,
      message
    });

    await anonymousInquiry.save();

    res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully',
      inquiry: anonymousInquiry
    });
  } catch (error) {
    console.error('Error creating anonymous inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inquiry',
      error: error.message
    });
  }
};

// Get all inquiries for a vendor (both logged-in and anonymous)
export const getVendorInquiries = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Get logged-in user inquiries
    const userInquiries = await Inquiry.find({ vendorId })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    // Get anonymous inquiries
    const anonymousInquiries = await AnonymousInquiry.find({ vendorId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        userInquiries,
        anonymousInquiries
      }
    });
  } catch (error) {
    console.error('Error fetching vendor inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries',
      error: error.message
    });
  }
};

// Reply to an inquiry (vendor can reply to both types)
export const replyToInquiry = async (req, res) => {
  try {
    const { inquiryId, inquiryType, message } = req.body;
    const vendorId = req.user.id;

    if (inquiryType === 'anonymous') {
      const inquiry = await AnonymousInquiry.findById(inquiryId);
      if (!inquiry || inquiry.vendorId.toString() !== vendorId) {
        return res.status(404).json({
          success: false,
          message: 'Inquiry not found or unauthorized'
        });
      }

      inquiry.vendorReply = {
        message,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inquiry.status = 'Replied';
      await inquiry.save();
    } else {
      const inquiry = await Inquiry.findById(inquiryId);
      if (!inquiry || inquiry.vendorId.toString() !== vendorId) {
        return res.status(404).json({
          success: false,
          message: 'Inquiry not found or unauthorized'
        });
      }

      // Add vendor reply to the userMessage array
      inquiry.userMessage.push({
        message: '',
        vendorReply: {
          message,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        date: new Date(),
        time: new Date().toLocaleTimeString(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      inquiry.replyStatus = 'Replied';
      await inquiry.save();
    }

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully'
    });
  } catch (error) {
    console.error('Error replying to inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};
