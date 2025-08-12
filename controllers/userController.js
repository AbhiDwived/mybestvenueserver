import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Venue from "../models/Venue.js";
import inquirySchema from "../models/Inquiry.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Contact from "../models/Contact.js";
import { logUserLogin } from '../utils/activityLogger.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { deleteFile } from '../utils/fileUtils.js';

dotenv.config();

const pendingRegistrations = {}; // { [email]: { userData, otp, otpExpires } }

// Register new user (with email OTP) - only store in DB after OTP verification
export const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    //  Validate required fields for registration
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    //  Check if user already exists in DB
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    //  Check if pending registration exists and handle OTP expiry
    if (pendingRegistrations[email]) {
      if (pendingRegistrations[email].otpExpires < Date.now()) {
        delete pendingRegistrations[email];
      } else {
        return res.status(400).json({ message: "OTP already sent. Please verify your email." });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins from now

    // Handle profile photo - use ImageKit URL if available
    const profilePhoto = req.fileUrl || null;

    // Store in pendingRegistrations
    pendingRegistrations[email] = {
      userData: { name, email, phone, password: hashedPassword, profilePhoto },
      otp,
      otpExpires,
    };

    // Send OTP email
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
      await sendEmail({
        email: email,
        subject: "Verify your email with this OTP",
        message: `Your OTP is ${otp}. It will expire in 10 minutes.`,
      });

      res.status(201).json({
        message: "OTP sent to email. Please verify to activate your account.",
        email,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      // Clean up pending registration if email fails
      delete pendingRegistrations[email];
      return res.status(500).json({ message: "Failed to send OTP email" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify OTP and complete registration (create user in DB only after OTP is verified)
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const pending = pendingRegistrations[email];
    if (!pending) {
      return res.status(400).json({ message: "No pending registration found. Please register again." });
    }

    //  Compare trimmed OTP and check expiry
    const trimmedOtp = otp?.toString().trim();
    const storedOtp = pending.otp?.toString();
    const isOtpMatch = trimmedOtp === storedOtp;
    const isExpired = pending.otpExpires < Date.now();

    if (!isOtpMatch || isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Create user in DB
    const newUser = new User({
      ...pending.userData,
      isVerified: true,
    });
    await newUser.save();

    // Remove from pendingRegistrations
    delete pendingRegistrations[email];

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Registration completed successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address,
        city: newUser.city,
        state: newUser.state,
        country: newUser.country,
        profilePhoto: newUser.profilePhoto,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};

// Resend OTP
export const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    //  Check if there is a pending registration
    if (!pendingRegistrations[email]) {
      return res.status(400).json({
        message: "No pending registration found for this email. Please register first.",
      });
    }

    // Generate new OTP and update in pendingRegistrations
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    pendingRegistrations[email].otp = otp;
    pendingRegistrations[email].otpExpires = otpExpires;

    // Send OTP via email
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
      await sendEmail({
        email: email,
        subject: "Your New OTP for Registration",
        message: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
      });

      return res.status(200).json({
        message: "New OTP sent to email.",
        email,
      });
    } catch (emailError) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Note: forgotPassword function moved to authController.js for centralized auth handling

// Resend Password Reset OTP
export const resendPasswordResetOtp = async (req, res) => {
  const { userId } = req.body;

  try {
    //  Find user in database and generate new OTP
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    user.markModified("otp");
    user.markModified("otpExpires");
    await user.save();

    // Send OTP via email
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
      await sendEmail({
        email: user.email,
        subject: "Your New Password Reset OTP",
        message: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
      });

      return res.status(200).json({
        message: "New password reset OTP sent to email",
        userId: user._id,
      });
    } catch (emailError) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify password reset OTP
export const verifyPasswordReset = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    //  Include hidden fields explicitly for OTP verification
    const user = await User.findById(userId).select("+otp +otpExpires");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const trimmedOtp = otp?.toString().trim();
    const storedOtp = user.otp?.toString();
    const isOtpMatch = trimmedOtp === storedOtp;
    const isExpired = user.otpExpires < Date.now();

    if (!isOtpMatch || isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({
      message: "OTP verified successfully",
      userId,
    });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};

// Reset password after OTP verification
export const resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  try {
    //  Include hidden fields explicitly for password reset
    const user = await User.findById(userId).select("+otp +otpExpires");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP missing or expired" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear OTP
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    //  Make sure to select the password field for comparison
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Log the login activity
    await logUserLogin(user, req);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// Get user profile (basic info)
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email weddingDate city state address"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Format location and wedding date for response
    const location = user.city || user.state || user.address || "Location not set";
    const weddingDate = user.weddingDate
      ? new Date(user.weddingDate).toISOString().split("T")[0]
      : "No wedding date set";

    res.status(200).json({
      userId: user._id,
      name: user.name,
      email: user.email,
      weddingDate,
      location,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get profile" });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, address, city, state, country, weddingDate } = req.body;

    //  Validate required fields for profile update
    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Name, email and phone are required" });
    }

    //  Check if email is being changed and if it's already in use
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ message: "Email is already in use by another user" });
    }

    //  Get the current user to check for existing profile photo
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Handle profile photo - use new URL if a file was uploaded
    let profilePhoto = currentUser.profilePhoto;
    if (req.fileUrl) {
      profilePhoto = req.fileUrl;
      if (currentUser.profilePhoto) {
        try {
          await deleteFile(currentUser.profilePhoto);
        } catch (error) {
          // Continue with update even if old image deletion fails
        }
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        weddingDate: weddingDate ? new Date(weddingDate) : null,
        profilePhoto,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Format the response to include all necessary fields
    const formattedUser = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      address: updatedUser.address,
      city: updatedUser.city,
      state: updatedUser.state,
      country: updatedUser.country,
      profilePhoto: updatedUser.profilePhoto,
      weddingDate: updatedUser.weddingDate,
      role: updatedUser.role,
    };

    res.status(200).json({
      message: "Profile updated successfully",
      user: formattedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    //  Find and delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

// Logout user (stateless, just a message)
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      message: "Logout successful. Please clear token on frontend.",
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging out", error: error.message });
  }
};

// Add venue to user's wishlist
export const addToWishlist = async (req, res) => {
  const userId = req.user.id;
  const { venueId } = req.params;

  try {
    //  Only add if venue exists and is approved
    const venue = await Venue.findById(venueId);
    if (!venue || !venue.isApproved) {
      return res.status(404).json({ message: "Venue not found or not approved" });
    }

    const user = await User.findById(userId);
    if (user.wishlist.includes(venueId)) {
      return res.status(400).json({ message: "Venue already in wishlist" });
    }

    user.wishlist.push(venueId);
    await user.save();

    res.status(200).json({ message: "Venue added to wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Error adding to wishlist", error: error.message });
  }
};

// Remove venue from wishlist
export const removeFromWishlist = async (req, res) => {
  const userId = req.user.id;
  const { venueId } = req.params;

  try {
    await User.findByIdAndUpdate(userId, {
      $pull: { wishlist: venueId },
    });

    res.status(200).json({ message: "Venue removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Error removing from wishlist", error: error.message });
  }
};

// Get user's wishlist
export const getWishlist = async (req, res) => {
  const userId = req.user.id;

  try {
    //  Populate wishlist with venue details and category name
    const user = await User.findById(userId).populate({
      path: "wishlist",
      populate: { path: "category", select: "name" },
    });

    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: "Error fetching wishlist", error: error.message });
  }
};

// Add user inquiry message
export const addUserInquiryMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { vendorId, message, name, email, phone, weddingDate } = req.body;

    //  Validate required fields for inquiry
    if (!userId || !vendorId || !message || !message.trim()) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userCheck = await User.findById(userId);
    if (!userCheck) return res.status(404).json({ message: "User not found" });

    let inquiry = await inquirySchema.findOne({ userId, vendorId });

    const newMessage = {
      message: message.trim()
    };

    if (inquiry) {
      inquiry.userMessage.push(newMessage);
      inquiry.replyStatus = "Pending";
      await inquiry.save();
    } else {
      inquiry = await inquirySchema.create({
        userId,
        vendorId,
        name,
        email,
        phone,
        eventDate: weddingDate,
        userMessage: [newMessage],
        replyStatus: "Pending"
      });
    }

    res.status(200).json({ message: "User inquiry saved", result: inquiry });
  } catch (error) {
    res.status(500).json({ message: "Error saving inquiry", error: error.message });
  }
};

// Get user inquiry list
export const getUserInquiryList = async (req, res) => {
  try {
    const { userId } = req.body;
    const userInquiryList = await inquirySchema
      .find({ userId })
      .sort({ createdAt: -1 })
      .populate("vendorId", "businessName");

    //  Format inquiry list with business name and vendorId
    const modifiedList = userInquiryList.map((inquiry) => ({
      ...inquiry.toObject(),
      business: inquiry.vendorId?.businessName || null,
      vendorId: inquiry.vendorId?._id || null,
    }));
    res.status(200).json({
      message: "User inquiry list fetched successfully",
      modifiedList,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user inquiry list",
      error: error.message,
    });
  }
};

// Update user inquiry
export const updateUserInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    if (!inquiryId)
      return res.status(404).json({ message: "Inquiry not found" });
    const { userId, weddingDate, message } = req.body;
    const updatedUserInquiry = await inquirySchema.findByIdAndUpdate(
      inquiryId,
      { userId, weddingDate, message },
      { new: true }
    );
    res.status(200).json({
      message: "User inquiry updated successfully",
      updatedUserInquiry,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user inquiry", error: error.message });
  }
};

// Update user password
export const updatePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    //  Validate required fields for password update
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    //  Find user and include password field
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Verify current password before updating
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating password", error: error.message });
  }
};

// Submit contact form
export const submitContactForm = async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
    //  Validate all fields for contact form
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newContact = new Contact({ name, email, phone, message });
    await newContact.save();
    
    return res.status(201).json({ 
      success: true,
      message: "Message sent successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to send message. Please try again." });
  }
};

// Get all contact messages (admin)
export const getAllMessage = async (req, res) => {
  try {
    const message = await Contact.find().sort({ createdAt: -1 });
    return res.status(201).send({ message: message });
  } catch (error) {
    return res.status(500).send({ error: "Failed to retrieve messages" });
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

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens({ id: user._id, email: user.email, role: user.role });

    //  Save the new refresh token to a DB/store with the user ID
    await User.findByIdAndUpdate(user._id, { 
      refreshToken: tokens.refreshToken 
    });

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        profilePhoto: user.profilePhoto,
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({ message: 'Error refreshing token', error: error.message });
  }
};

// Get user profile by ID
export const getUserProfileById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('name email phone profilePhoto location weddingDate partnerName about city state country');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    //  Format the user data for response
    const formattedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      location: user.city || user.state || user.country || 'Location not set',
      weddingDate: user.weddingDate,
      partnerName: user.partnerName,
      about: user.about,
      city: user.city,
      state: user.state,
      country: user.country
    };

    res.status(200).json({
      success: true,
      user: formattedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
