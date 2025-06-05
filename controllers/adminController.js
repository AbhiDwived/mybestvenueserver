// server/controllers/adminController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Vendor from '../models/Vendor.js';

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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Admin Registration OTP',
      text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions);

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
      { expiresIn: '1h' }
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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: 'Your New OTP for Admin Registration',
      text: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions);

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
      { expiresIn: '1h' }
    );

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
    // Include profilePicture in the selection
    const vendors = await Vendor.find().select("businessName vendorType contactName email phone createdAt isApproved profilePicture");

    const formattedVendors = vendors.map((vendor) => ({
      _id: vendor._id,
      name: vendor.businessName,
      email: vendor.email,
      phone: vendor.phone,
      isApproved: vendor.isApproved,
      appliedDate: vendor.createdAt?.toISOString().split("T")[0] || "N/A",
      category: vendor.vendorType,
      profilePicture: vendor.profilePicture || null, // ✅ Include profile picture
    }));

    res.status(200).json({
      message: "Vendors fetched successfully",
      vendors: formattedVendors,
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