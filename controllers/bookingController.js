import Booking from '../models/Booking.js';
import Vendor from '../models/Vendor.js';
import mongoose from 'mongoose';
import { logBookingCreated, logBookingStatusUpdate } from '../utils/activityLogger.js';

// Get all bookings for a user
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all bookings for the user
    const bookings = await Booking.find({ user: userId })
      .populate('vendor', 'businessName email phone profilePhoto')
      .sort({ createdAt: -1 });

    // Calculate total planned and spent amounts for user's bookings
    const totalPlanned = bookings.reduce((sum, booking) => sum + booking.plannedAmount, 0);
    const totalSpent = bookings.reduce((sum, booking) => sum + booking.spentAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        totalPlanned,
        totalSpent,
        totalBookingsCount: bookings.length,
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get a single booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID',
      });
    }

    // Ensure booking belongs to the requesting user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId,
    }).populate('vendor', 'businessName email phone profilePhoto');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vendorId,
      vendorName,
      eventType,
      eventDate,
      eventTime,
      venue,
      guestCount,
      plannedAmount,
      notes,
    } = req.body;

    // Validate required fields for booking creation
    if (!vendorName || !eventType || !plannedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Vendor name, event type, and planned amount are required',
      });
    }

    // If vendorId is provided, check if vendor exists
    let vendor = null;
    if (vendorId) {
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID',
        });
      }

      vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }
    }

    // Create new booking document
    const newBooking = new Booking({
      user: userId,
      vendor: vendorId || null,
      vendorName,
      eventType,
      eventDate: eventDate || null,
      eventTime: eventTime || null,
      venue: venue || '',
      guestCount: guestCount || 0,
      plannedAmount: Number(plannedAmount),
      spentAmount: 0,
      notes: notes || '',
    });

    await newBooking.save();

    res.status(201).json({
      success: true,
      data: newBooking,
      message: 'Booking created successfully',
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Update a booking
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID',
      });
    }

    // Ensure booking belongs to the user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // If vendorId is being updated, validate and check existence
    if (updateData.vendorId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.vendorId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID',
        });
      }

      const vendor = await Vendor.findById(updateData.vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }
      booking.vendor = updateData.vendorId;
    }

    // Update booking fields if provided
    if (updateData.vendorName !== undefined) booking.vendorName = updateData.vendorName;
    if (updateData.eventType !== undefined) booking.eventType = updateData.eventType;
    if (updateData.eventDate !== undefined) booking.eventDate = updateData.eventDate || null;
    if (updateData.eventTime !== undefined) booking.eventTime = updateData.eventTime;
    if (updateData.venue !== undefined) booking.venue = updateData.venue;
    if (updateData.guestCount !== undefined) booking.guestCount = Number(updateData.guestCount) || 0;
    if (updateData.plannedAmount !== undefined) booking.plannedAmount = Number(updateData.plannedAmount);
    if (updateData.spentAmount !== undefined) booking.spentAmount = Number(updateData.spentAmount);
    if (updateData.status !== undefined) booking.status = updateData.status;
    if (updateData.notes !== undefined) booking.notes = updateData.notes;

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Delete a booking
export const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID',
      });
    }

    // Ensure booking belongs to the user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    await Booking.findByIdAndDelete(bookingId);

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get available vendors for booking
export const getAvailableVendors = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = { role: 'vendor', isVerified: true };
    
    // Filter vendors by category if provided
    if (category) {
      query.category = category;
    }
    
    const vendors = await Vendor.find(query)
      .select('businessName email phone profilePhoto category');
      
    res.status(200).json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message, 
    });
  }
}; 

// Vendor booking list
export const getVendorBookings = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }
    
    // Find all bookings for a specific vendor
    const bookings = await Booking.find({ vendor: vendorId })
      .populate('user', 'name businessName email phone profilePhoto')
      .sort({ createdAt: -1 });

    // Calculate totals and status counts for vendor's bookings
    const totalPlanned = bookings.reduce((sum, b) => sum + (b.plannedAmount || 0), 0);
    const totalSpent = bookings.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
    
    const statusCounts = bookings.reduce((counts, booking) => {
      const status = booking.status?.toLowerCase(); 
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        bookings: bookings || [],
        totalPlanned,
        totalSpent,
        totalBookingsCount: bookings.length,
        completedBookingsCount: statusCounts['completed'] || 0,
        pendingBookingsCount: statusCounts['pending'] || 0,
        confirmedBookingsCount: statusCounts['confirmed'] || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Update vendor bookings
export const updateVendorBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const vendorId = req.user.id;
    const updateData = req.body;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Vendor not found in request',
      });
    }

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID',
      });
    }

    // Ensure booking belongs to the vendor
    const booking = await Booking.findOne({
      _id: bookingId,
      vendor: vendorId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // If vendorId is being updated, validate and check existence
    if (updateData.vendorId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.vendorId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID',
        });
      }

      const vendor = await Vendor.findById(updateData.vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }
      booking.vendor = updateData.vendorId;
    }

    // Update booking fields if provided
    if (updateData.vendorName !== undefined) booking.vendorName = updateData.vendorName;
    if (updateData.eventType !== undefined) booking.eventType = updateData.eventType;
    if (updateData.eventDate !== undefined) booking.eventDate = updateData.eventDate || null;
    if (updateData.eventTime !== undefined) booking.eventTime = updateData.eventTime;
    if (updateData.venue !== undefined) booking.venue = updateData.venue;
    if (updateData.guestCount !== undefined) booking.guestCount = Number(updateData.guestCount) || 0;
    if (updateData.plannedAmount !== undefined) booking.plannedAmount = Number(updateData.plannedAmount);
    if (updateData.spentAmount !== undefined) booking.spentAmount = Number(updateData.spentAmount);
    if (updateData.status !== undefined) booking.status = updateData.status;
    if (updateData.notes !== undefined) booking.notes = updateData.notes;

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error ',
      error: error.message,
    });
  }
};

// Get all bookings (Admin only)
export const getAllBookings = async (req, res) => {
  try {
    // Only admin can access all bookings
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can access all bookings.',
      });
    }

    // Find all bookings with user and vendor details
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate('vendor', 'businessName email phone')
      .sort({ createdAt: -1 });

    // Calculate statistics for all bookings
    const totalPlanned = bookings.reduce((sum, booking) => sum + (booking.plannedAmount || 0), 0);
    const totalSpent = bookings.reduce((sum, booking) => sum + (booking.spentAmount || 0), 0);
    
    const statusCounts = bookings.reduce((counts, booking) => {
      const status = booking.status?.toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        bookings,
        totalPlanned,
        totalSpent,
        totalBookingsCount: bookings.length,
        completedBookingsCount: statusCounts['completed'] || 0,
        pendingBookingsCount: statusCounts['pending'] || 0,
        confirmedBookingsCount: statusCounts['confirmed'] || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

