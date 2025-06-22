import { logInquirySent } from '../utils/activityLogger.js';

// Create a new inquiry
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
