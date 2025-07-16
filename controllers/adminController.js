// server/controllers/adminController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Vendor from '../models/Vendor.js';
import { logUserLogin } from '../utils/activityLogger.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/authMiddleware.js';
import { sendEmail } from '../utils/sendEmail.js';

// Register Admin
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

    await sendEmail({
      email,
      subject: 'Your Admin Registration OTP',
      message: `Your OTP is ${otp}. It will expire in 10 minutes.`
    });

    res.status(201).json({
      message: 'Admin registration pending. OTP sent to email.',
      adminId: newAdmin._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error: error.message });
  }
};

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

    await sendEmail({
      email: admin.email,
      subject: 'Your New OTP for Admin Registration',
      message: `Your new OTP is: ${otp}. It will expire in 10 minutes.`
    });

    res.status(200).json({
      message: 'New OTP sent to admin email.',
      adminId: admin._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};

// Login Admin
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



export const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isApproved: true });

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
      vendorType: vendor.vendorType,
      email: vendor.email,
      phone: vendor.phone,
      // address: {
      //   city: vendor.address?.city || '',
      //   state: vendor.address?.state || '',
      //   country: vendor.address?.country || 'India'
      // },
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

// Get All Users
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

// Get vendor counts by category for a location
export const getVendorCountsByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    
    // If location is 'all-india', don't filter by location
    const locationFilter = location.toLowerCase() === 'all-india' ? {} : {
      $or: [
        { 'address.city': { $regex: new RegExp(location, 'i') } },
        { serviceAreas: { $regex: new RegExp(location, 'i') } }
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

// Refresh token endpoint
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