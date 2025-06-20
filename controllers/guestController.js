import Guest from '../models/Guest.js';
import mongoose from 'mongoose';

// Get all guests for the logged-in user
export const getUserGuests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const guests = await Guest.find({ user: userId }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: guests,
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Add a new guest
export const addGuest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Guest name is required',
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'At least email or phone is required',
      });
    }

    const newGuest = new Guest({
      user: userId,
      name,
      email,
      phone,
      status: status || 'pending',
    });

    await newGuest.save();

    res.status(201).json({
      success: true,
      data: newGuest,
      message: 'Guest added successfully',
    });
  } catch (error) {
    console.error('Error adding guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Update guest information
export const updateGuest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { guestId } = req.params;
    const { name, email, phone, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(guestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guest ID',
      });
    }

    // Find the guest and make sure it belongs to the current user
    const guest = await Guest.findOne({ _id: guestId, user: userId });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found',
      });
    }

    // Update fields if provided
    if (name) guest.name = name;
    if (email !== undefined) guest.email = email;
    if (phone !== undefined) guest.phone = phone;
    if (status) guest.status = status;

    // Validate that either email or phone is provided
    if (!guest.email && !guest.phone) {
      return res.status(400).json({
        success: false,
        message: 'At least email or phone is required',
      });
    }

    await guest.save();

    res.status(200).json({
      success: true,
      data: guest,
      message: 'Guest updated successfully',
    });
  } catch (error) {
    console.error('Error updating guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Update guest status only
export const updateGuestStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { guestId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(guestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guest ID',
      });
    }

    if (!status || !['pending', 'confirmed', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (pending, confirmed, or declined)',
      });
    }

    // Find and update the guest
    const guest = await Guest.findOneAndUpdate(
      { _id: guestId, user: userId },
      { status },
      { new: true }
    );

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found',
      });
    }

    res.status(200).json({
      success: true,
      data: guest,
      message: 'Guest status updated successfully',
    });
  } catch (error) {
    console.error('Error updating guest status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Delete a guest
export const deleteGuest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { guestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(guestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guest ID',
      });
    }

    // Find and delete the guest
    const guest = await Guest.findOneAndDelete({ _id: guestId, user: userId });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Guest deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
