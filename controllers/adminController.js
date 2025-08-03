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
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Vendor from '../models/Vendor.js';
import { logUserLogin } from '../utils/activityLogger.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/authMiddleware.js';
import Event from '../models/Event.js';

/**
 * Register a new admin
 * 
 * Creates a new admin account with email verification via OTP.
 * Sends verification email with 6-digit OTP that expires in 10 minutes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing admin details
 * @param {string} req.body.name - Admin's full name
 * @param {string} req.body.email - Admin's email address
 * @param {string} req.body.password - Admin's password (will be hashed)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status and admin ID
 */
export const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
    });

    await newAdmin.save();

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

/**
 * Verify admin OTP
 * 
 * Verifies the OTP sent to admin's email during registration.
 * Upon successful verification, marks admin as verified and returns JWT token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.adminId - Admin's database ID
 * @param {string} req.body.otp - 6-digit OTP code
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with JWT token and admin details
 */
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

    if (admin.otp !== otp || admin.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    admin.isVerified = true;
    admin.otp = undefined;
    admin.otpExpires = undefined;
    await admin.save();

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

/**
 * Resend admin OTP
 * 
 * Generates and sends a new OTP to admin's email if the previous one expired.
 * Only works for unverified admin accounts.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.adminId - Admin's database ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming OTP resent
 */
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    admin.otp = otp;
    admin.otpExpires = otpExpires;
    await admin.save();

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

/**
 * Admin login
 * 
 * Authenticates admin with email and password.
 * Returns JWT token and logs the login activity.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - Admin's email address
 * @param {string} req.body.password - Admin's password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with JWT token and admin details
 */
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7D' }
    );

    // Log the login activity
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

/**
 * Update admin profile
 * 
 * Updates admin profile information including name, email, phone, profile photo, and password.
 * Password is hashed before saving if provided.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.adminId - Admin's database ID
 * @param {Object} req.body - Request body with update fields
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated admin details
 */
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

/**
 * Approve vendor
 * 
 * Approves a vendor by setting their isApproved status to true.
 * Only approved vendors can be displayed to users.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.vendorId - Vendor's database ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with approved vendor details
 */
export const approveVendor = async (req, res) => {
  const { vendorId } = req.params;

  try {
    // Find the vendor by ID and update their approval status
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { isApproved: true },
      { new: true } // Return the updated document
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

/**
 * Get pending vendors
 * 
 * Retrieves all vendors that are waiting for admin approval.
 * Returns vendors with isApproved status set to false.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of pending vendors
 */
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



/**
 * Get all approved vendors
 * 
 * Retrieves all approved vendors with formatted data including location information.
 * Also returns unique locations from service areas and addresses.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with vendors array and unique locations
 */
export const getAllVendors = async (req, res) => {
  try {
    const { location } = req.query;

    // If location is provided, filter by location
    const locationFilter = location ? {
      $or: [
        { 'address.city': { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } },
        { serviceAreas: { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } }
      ]
    } : {};

    const vendors = await Vendor.find({
      ...locationFilter,
      isApproved: true
    });

    // Get unique locations from both serviceAreas and addresses
    const uniqueLocations = new Set();
    vendors.forEach(vendor => {
      if (vendor.serviceAreas && Array.isArray(vendor.serviceAreas)) {
        vendor.serviceAreas.forEach(area => uniqueLocations.add(area));
      }
      if (vendor.address?.city) {
        uniqueLocations.add(vendor.address.city);
      }
    });

    const formattedVendors = vendors.map((vendor) => ({
      _id: vendor._id,
      businessName: vendor.businessName,
      businessType: vendor.businessType,
      vendorType: vendor.vendorType,
      venueType: vendor.venueType,
      email: vendor.email,
      phone: vendor.phone,
      address:vendor.address || {},
      services: vendor.services || [],
      serviceAreas: vendor.serviceAreas || [],
      pricing: vendor.pricing || [],
      pricingRange: vendor.pricingRange ? {
        min: vendor.pricingRange.min,
        max: vendor.pricingRange.max,
        currency: vendor.pricingRange.currency || 'INR'
      } : null,
      profilePicture: vendor.profilePicture,
      galleryImages: vendor.galleryImages || [],
      isApproved: vendor.isApproved,
      appliedDate: vendor.createdAt?.toISOString().split("T")[0] || "N/A",
      createdAt: vendor.createdAt // Adding createdAt for sorting
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

/**
 * Delete vendor by admin
 * 
 * Allows admin to delete a vendor from the system.
 * This is a permanent action and cannot be undone.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.vendorId - Vendor's database ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming vendor deletion
 */
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

/**
 * Get all users
 * 
 * Retrieves all registered users from the system.
 * Excludes sensitive information like passwords.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with formatted users array
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude sensitive fields

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

/**
 * Delete user by admin
 * 
 * Allows admin to delete a user account from the system.
 * This is a permanent action and cannot be undone.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.userId - User's database ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming user deletion
 */
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

/**
 * Get vendor counts by location
 * 
 * Returns vendor counts grouped by category for a specific location.
 * Supports 'all-india' as a special location to get counts for all vendors.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.location - Location name or 'all-india'
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with category counts and total vendors
 */
export const getVendorCountsByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    
    // If location is 'all-india', don't filter by location
    const locationFilter = location.toLowerCase() === 'all-india' ? {} : {
      $or: [
        { 'address.city': { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } },
        { serviceAreas: { $regex: new RegExp(`^${location.replace('-', '\\s+')}$`, 'i') } }
      ]
    };

    // Get all approved vendors for the location
    const vendors = await Vendor.find({
      ...locationFilter,
      isApproved: true
    });

    // Count vendors by category
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

/**
 * Refresh JWT token
 * 
 * Generates new access and refresh tokens using a valid refresh token.
 * Used to maintain user session without requiring re-login.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.refreshToken - Valid refresh token
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with new tokens and admin details
 */
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

/**
 * Get latest vendors by type
 * 
 * Retrieves the most recently added vendor from each vendor type.
 * Useful for displaying diverse vendor categories on the homepage.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with latest vendors grouped by type
 */
export const getLatestVendorsByType = async (req, res) => {
  try {
    // Get all approved vendors
    const vendors = await Vendor.find({ isApproved: true })
      .sort({ createdAt: -1 }); // Sort by creation date descending

    // Group vendors by type and get the latest from each type
    const vendorsByType = {};
    vendors.forEach(vendor => {
      if (!vendor.vendorType) return;
      
      // Since we sorted by createdAt, the first vendor of each type will be the latest
      if (!vendorsByType[vendor.vendorType]) {
        vendorsByType[vendor.vendorType] = vendor;
      }
    });

    // Convert the grouped vendors object to an array
    const latestVendors = Object.values(vendorsByType);

    // Format the vendors
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
      serviceAreas: vendor.serviceAreas || [],
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

export const createRideByAdmin = async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      isActive: true
    };
    
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

