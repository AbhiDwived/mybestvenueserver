/**
 * Admin Controller
 * 
 * This controller handles all admin-related operations including:
 * - Admin registration and authentication
 * - Vendor management and approval
 * - User management
 * - Admin profile management
 * - Token refresh functionality
 * 
 * @author Wedding Wire Team
 * @version 1.0.0
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Vendor from '../models/Vendor.js';
import { logUserLogin } from '../utils/activityLogger.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/authMiddleware.js';
import Event from '../models/Event.js';

// Register a new admin (with OTP email verification)
export const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if admin already exists
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Hash password for security
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save new admin with OTP (not verified yet)
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
    });
    await newAdmin.save();

    // Send OTP email (dynamic import for sendEmail utility)
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
      await sendEmail({
        email: email,
        subject: 'Your Admin Registration OTP',
        message: `Your OTP is ${otp}. It will expire in 10 minutes.`,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.status(201).json({
      message: 'Admin registration pending. OTP sent to email.',
      adminId: newAdmin._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error: error.message });
  }
};

// Verify admin OTP (for registration)
export const verifyAdminOtp = async (req, res) => {
  const { adminId, otp } = req.body;
  try {
    const admin = await Admin.findById(adminId).select('+otp +otpExpires');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.isVerified) {
      return res.status(400).json({ message: 'Admin already verified' });
    }
    // Check OTP and expiry
    if (admin.otp !== otp || admin.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    admin.isVerified = true;
    admin.otp = undefined;
    admin.otpExpires = undefined;
    await admin.save();

    // Issue JWT token after verification
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7D' }
    );
    res.status(200).json({
      message: 'Admin verified successfully',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Resend admin OTP (for unverified admins)
export const resendAdminOtp = async (req, res) => {
  const { adminId } = req.body;
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.isVerified) {
      return res.status(400).json({ message: 'Admin already verified' });
    }
    // Generate new OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    admin.otp = otp;
    admin.otpExpires = otpExpires;
    await admin.save();

    // Send new OTP email
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
      await sendEmail({
        email: admin.email,
        subject: 'Your New OTP for Admin Registration',
        message: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.status(200).json({
      message: 'New OTP sent to admin email.',
      adminId: admin._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};

// Admin login (with JWT and login activity logging)
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    // Compare password hash
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Issue JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7D' }
    );
    // Log login activity (for auditing)
    await logUserLogin({
      _id: admin._id,
      name: admin.name,
      role: 'admin',
      email: admin.email
    }, req);

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in admin', error: error.message });
  }
};

// Update admin profile (name, email, phone, photo, password)
export const updateAdminProfile = async (req, res) => {
  const { adminId } = req.params;
  const {
    name,
    email,
    phone,
    profilePhoto,
    password,
  } = req.body;
  try {
    const admin = await Admin.findById(adminId).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (profilePhoto) admin.profilePhoto = profilePhoto;
    // Hash password if updating
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      admin.password = hashedPassword;
    }
    await admin.save();
    res.status(200).json({
      message: 'Admin profile updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        profilePhoto: admin.profilePhoto,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating admin profile', error: error.message });
  }
};

// Approve vendor (set isApproved to true)
export const approveVendor = async (req, res) => {
  const { vendorId } = req.params;
  try {
    // Find and update vendor
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { isApproved: true },
      { new: true }
    );
    if (!updatedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json({
      message: 'Vendor approved successfully',
      vendor: updatedVendor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error approving vendor', error: error.message });
  }
};

// Get all pending vendors (isApproved: false)
export const getPendingVendors = async (req, res) => {
  try {
    const pendingVendors = await Vendor.find({ isApproved: false });
    res.status(200).json({
      message: 'Pending vendors fetched successfully',
      vendors: pendingVendors,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching pending vendors',
      error: error.message,
    });
  }
};

// Get all approved vendors (with optional location filter and unique locations)
export const getAllVendors = async (req, res) => {
  try {
    const { location } = req.query;
    // If location is provided, filter by city or service area (case-insensitive)
    const locationFilter = location ? {
      $or: [
        { 'address.city': { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } },
        { city: { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } }
      ]
    } : {};
    const vendors = await Vendor.find({
      ...locationFilter,
      isApproved: true
    });

    // Collect unique locations from address.city
    const uniqueLocations = new Set();
    vendors.forEach(vendor => {
      if (vendor.city) {
        uniqueLocations.add(vendor.city);
      }
    });

    // Format vendor data for frontend
    const formattedVendors = vendors.map((vendor) => ({
      _id: vendor._id,
      businessName: vendor.businessName,
      businessType: vendor.businessType,
      vendorType: vendor.vendorType,
      venueType: vendor.venueType,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address || {},
      services: vendor.services || [],
      pricing: vendor.pricing || [],
      pricingRange: vendor.pricingRange ? {
        min: vendor.pricingRange.min,
        max: vendor.pricingRange.max,
        currency: vendor.pricingRange.currency || 'INR'
      } : null,
      profilePicture: vendor.profilePicture,
      galleryImages: vendor.galleryImages || [],
      isApproved: vendor.isApproved,
      isPremium: vendor.isPremium || false,
      isTrusted: vendor.isTrusted || false,
      appliedDate: vendor.createdAt?.toISOString().split("T")[0] || "N/A",
      createdAt: vendor.createdAt,
      city: vendor.city,
      location: vendor.location,
      displayLocation: vendor.displayLocation,
      nearLocation: vendor.nearLocation
    }));

    res.status(200).json({
      message: "Vendors fetched successfully",
      vendors: formattedVendors,
      locations: Array.from(uniqueLocations).sort()
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching vendors", error: error.message });
  }
};

// Delete vendor by admin (permanent)
export const deleteVendorByAdmin = async (req, res) => {
  const { vendorId } = req.params;
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(vendorId);
    if (!deletedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json({
      message: 'Vendor deleted successfully by admin',
      vendor: deletedVendor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
};

// Get all users (excluding passwords)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      createdAt: user.createdAt?.toISOString().split('T')[0] || 'N/A',
      role: user.role || 'user',
    }));
    res.status(200).json({
      message: 'Users fetched successfully',
      users: formattedUsers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Delete user by admin (permanent)
export const deleteUserByAdmin = async (req, res) => {
  const { userId } = req.params;
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      message: 'User deleted successfully by admin',
      user: deletedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Get vendor counts by location (grouped by vendorType)
export const getVendorCountsByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    // Special case: 'all-india' returns all vendors
    const locationFilter = location.toLowerCase() === 'all-india' ? {} : {
      $or: [
        { 'address.city': { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } },
        { city: { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } }
      ]
    };
    const vendors = await Vendor.find({
      ...locationFilter,
      isApproved: true
    });
    // Count vendors by vendorType
    const categoryCounts = vendors.reduce((acc, vendor) => {
      const category = vendor.vendorType;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    res.status(200).json({
      message: "Vendor counts fetched successfully",
      categoryCounts,
      totalVendors: vendors.length
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching vendor counts", error: error.message });
  }
};

// Refresh JWT token (using refresh token)
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }
    // Generate new tokens
    const tokens = generateTokens({ id: admin._id, email: admin.email, role: 'admin' });
    res.status(200).json({
      message: 'Token refreshed successfully',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        profilePhoto: admin.profilePhoto,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Error refreshing token', error: error.message });
  }
};

// Get latest vendor for each vendorType (for homepage diversity)
export const getLatestVendorsByType = async (req, res) => {
  try {
    // Get all approved vendors, newest first
    const vendors = await Vendor.find({ isApproved: true })
      .sort({ createdAt: -1 });
    // Group by vendorType, keep only latest per type
    const vendorsByType = {};
    vendors.forEach(vendor => {
      if (!vendor.vendorType) return;
      if (!vendorsByType[vendor.vendorType]) {
        vendorsByType[vendor.vendorType] = vendor;
      }
    });
    const latestVendors = Object.values(vendorsByType);
    const formattedVendors = latestVendors.map((vendor) => ({
      _id: vendor._id,
      businessName: vendor.businessName,
      vendorType: vendor.vendorType,
      email: vendor.email,
      phone: vendor.phone,
      address: {
        city: vendor.address?.city || '',
        state: vendor.address?.state || '',
        country: vendor.address?.country || 'India'
      },
      pricingRange: vendor.pricingRange ? {
        min: vendor.pricingRange.min,
        max: vendor.pricingRange.max,
        currency: vendor.pricingRange.currency || 'INR'
      } : null,
      profilePicture: vendor.profilePicture,
      galleryImages: vendor.galleryImages || [],
      isApproved: vendor.isApproved,
      appliedDate: vendor.createdAt?.toISOString().split("T")[0] || "N/A",
      createdAt: vendor.createdAt
    }));
    res.status(200).json({
      message: "Latest vendors by type fetched successfully",
      vendors: formattedVendors
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching latest vendors", error: error.message });
  }
};

// Get all active rides (events) for admin
export const getAllRides = async (req, res) => {
  try {
    const rides = await Event.find({ isActive: true })
      .populate('vendorId', 'businessName email phone')
      .sort({ eventDate: -1 });
    res.status(200).json({
      message: 'All rides fetched successfully',
      rides
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rides', error: error.message });
  }
};

// Create a new ride (event) by admin
export const createRideByAdmin = async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      isActive: true
    };
    // If vendorId is not provided, remove it (optional ride)
    if (!rideData.vendorId) {
      delete rideData.vendorId;
    }
    const newRide = new Event(rideData);
    await newRide.save();
    const populatedRide = await Event.findById(newRide._id)
      .populate('vendorId', 'businessName email phone');
    res.status(201).json({
      message: 'Ride created successfully',
      ride: populatedRide
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating ride', error: error.message });
  }
};

// Update ride (event) by admin
export const updateRideByAdmin = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updateData = req.body;
    const updatedRide = await Event.findByIdAndUpdate(
      rideId,
      updateData,
      { new: true }
    ).populate('vendorId', 'businessName email phone');
    if (!updatedRide) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    res.status(200).json({
      message: 'Ride updated successfully',
      ride: updatedRide
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating ride', error: error.message });
  }
};

// Delete ride (event) by admin
export const deleteRideByAdmin = async (req, res) => {
  try {
    const { rideId } = req.params;
    const deletedRide = await Event.findByIdAndDelete(rideId);
    if (!deletedRide) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    res.status(200).json({
      message: 'Ride deleted successfully',
      ride: deletedRide
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting ride', error: error.message });
  }
};

// Get all rides for a specific vendor
export const getRidesByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const rides = await Event.find({ vendorId, isActive: true })
      .populate('vendorId', 'businessName email phone')
      .sort({ eventDate: -1 });
    res.status(200).json({
      message: 'Vendor rides fetched successfully',
      rides
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor rides', error: error.message });
  }
};
// Toggle vendor premium status
export const toggleVendorPremium = async (req, res) => {
  const { vendorId } = req.params;
  const { isPremium } = req.body;
  try {
    const updateData = { isPremium };
    if (isPremium) {
      updateData.isTrusted = false; // Mutual exclusivity
    }
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updateData,
      { new: true }
    );
    if (!updatedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json({
      message: `Vendor ${isPremium ? 'upgraded to Premium' : 'downgraded to Normal'}`,
      vendor: updatedVendor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating vendor premium status', error: error.message });
  }
};

// Toggle vendor trusted status
export const toggleVendorTrusted = async (req, res) => {
  const { vendorId } = req.params;
  const { isTrusted } = req.body;
  try {
    const updateData = { isTrusted };
    if (isTrusted) {
      updateData.isPremium = false; // Mutual exclusivity
    }
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updateData,
      { new: true }
    );
    if (!updatedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json({
      message: `Vendor ${isTrusted ? 'marked as Trusted' : 'unmarked as Trusted'}`,
      vendor: updatedVendor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating vendor trusted status', error: error.message });
  }
};

// Logout admin (stateless, just a message)
export const logoutAdmin = async (req, res) => {
  try {
    res.status(200).json({
      message: "Admin logout successful. Please clear token on frontend.",
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging out admin", error: error.message });
  }
};
