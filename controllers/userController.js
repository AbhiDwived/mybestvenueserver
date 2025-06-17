import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import inquirySchema from '../models/Inquiry.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { withTransaction, sanitizeData, optimizeQuery } from '../utils/dbUtils.js';

dotenv.config();

// Register new user (with email OTP)
export const register = async (req, res) => {
  try {
    const sanitizedData = sanitizeData(req.body);
    const { name, email, phone, password } = sanitizedData;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Use transaction for user registration
    const result = await withTransaction(async (session) => {
      // Check if user already exists using optimized query
      const userExists = await optimizeQuery(
        User.findOne({ email }), 
        ['_id', 'email']
      ).session(session);

      if (userExists) {
        throw new Error("User already exists");
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 12);

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins from now

      // Handle profile photo
      const profilePhoto = req.file ? `/uploads/users/${req.file.filename}` : null;

      // Create user
      const newUser = new User({
        name,
        email,
        phone,
        password: hashedPassword,
        otp,
        otpExpires,
        isVerified: false,
        role: "user",
        profilePhoto,
      });

      await newUser.save({ session });

      // Debug logs
      const savedUser = await optimizeQuery(
        User.findById(newUser._id),
        ['_id', 'email', 'otp', 'otpExpires']
      ).session(session);
      
      console.log("Saved OTP:", savedUser.otp);

      return { user: savedUser, otp };
    });

    // Send OTP email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your email with this OTP",
      text: `Your OTP is ${result.otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Failed to send OTP email" });
      }
      console.log("OTP email sent:", info.response);

      res.status(201).json({
        message: "OTP sent to email. Please verify to activate your account.",
        userId: result.user._id,
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify OTP and complete registration
export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  console.log("--- VERIFY OTP DEBUG START ---");
  console.log("Received userId:", userId);
  console.log("Received raw OTP:", otp);

  try {
    const result = await withTransaction(async (session) => {
      // Find user with optimized query
      const user = await optimizeQuery(
        User.findById(userId),
        ['_id', 'email', 'otp', 'otpExpires', 'isVerified', 'name', 'phone', 'address', 'city', 'state', 'country', 'profilePhoto']
      ).session(session);

      if (!user) {
        console.log("User not found for ID:", userId);
        throw new Error("User not found");
      }

      console.log("Found user:", {
        id: user._id,
        email: user.email,
        storedOtp: user.otp,
        otpExpires: user.otpExpires,
        isVerified: user.isVerified,
        now: new Date(),
      });

      // Check if already verified
      if (user.isVerified) {
        console.log("User is already verified.");
        throw new Error("User already verified");
      }

      // Compare OTP and check expiration
      const trimmedOtp = otp?.toString().trim();
      const storedOtp = user.otp?.toString();

      // Ensure both values are strings and properly compared
      const isOtpMatch = trimmedOtp === storedOtp;
      const isExpired = user.otpExpires < Date.now();

      console.log(
        "OTP Match?",
        isOtpMatch
          ? "✅ Yes"
          : `❌ No (Expected "${storedOtp}", Got "${trimmedOtp}")`
      );
      console.log("OTP Expired?", isExpired ? "✅ Yes" : "❌ No");

      if (!isOtpMatch || isExpired) {
        throw new Error("Invalid or expired OTP");
      }

      // Mark user as verified
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ session });

      console.log("✅ OTP Verified Successfully. User marked as verified.");

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7D" }
      );

      return { user, token };
    });

    res.status(200).json({
      message: "Registration completed successfully",
      token: result.token,
      user: {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        address: result.user.address,
        city: result.user.city,
        state: result.user.state,
        country: result.user.country,
        profilePhoto: result.user.profilePhoto,
      },
    });

    console.log("--- VERIFY OTP DEBUG END ---\n");
  } catch (error) {
    console.error("🚨 Error verifying OTP:", error.message);
    res
      .status(error.message.includes("not found") ? 404 : 400)
      .json({ message: error.message });
  }
};

// Resend OTP
export const resendOtp = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update user with new OTP
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your New OTP for Registration",
      text: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Error sending OTP email" });
      }
    });

    res.status(200).json({
      message: "New OTP sent to email.",
      userId: user._id,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resending OTP", error: error.message });
  }
};

// forgotPassword
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;

    user.markModified("otp");
    user.markModified("otpExpires");

    await user.save();

    console.log("🔐 OTP:", otp);
    console.log("🕒 OTP Expires:", new Date(otpExpires));
    console.log("📧 Email to be sent to:", user.email);

    // ✉️ SEND OTP VIA EMAIL
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      timeout: 10000,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Password Reset OTP",
      text: `Your OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Error sending email:", error.message);
        console.error("Full error:", error); // Log full error object
        return res.status(500).json({ message: "Failed to send OTP email" });
      }
      console.log("📨 Email sent successfully:", info.response);
    });

    res.status(200).json({
      message: "OTP sent to email",
      userId: user._id,
    });
  } catch (error) {
    console.error("🚨 Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// verifyPasswordReset
export const verifyPasswordReset = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    // Include hidden fields explicitly
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
    res
      .status(500)
      .json({ message: "Error verifying OTP", error: error.message });
  }
};

// resetPassword
export const resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  try {
    // Include hidden fields explicitly
    const user = await User.findById(userId).select("+otp +otpExpires");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP missing or expired" });
    }

    // Hash new password using the User model's pre-save hook
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password
    const isMatch = await user.isPasswordMatch(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7D" }
    );

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

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, address, city, state, country, weddingDate } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Name, email and phone are required" });
    }

    // Check if email is being changed and if it's already in use
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ message: "Email is already in use by another user" });
    }

    // Handle profile photo if uploaded
    let profilePhoto;
    if (req.file) {
      profilePhoto = `/uploads/users/${req.file.filename}`;
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
        ...(profilePhoto && { profilePhoto }),
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
      role: updatedUser.role
    };

    res.status(200).json({
      message: "Profile updated successfully",
      user: formattedUser
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find and delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      message: 'Logout successful. Please clear token on frontend.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};

// Add venue to user's wishlist
export const addToWishlist = async (req, res) => {
  const userId = req.user.id;
  const { venueId } = req.params;

  try {
    const venue = await Venue.findById(venueId);
    if (!venue || !venue.isApproved) {
      return res.status(404).json({ message: 'Venue not found or not approved' });
    }

    const user = await User.findById(userId);
    if (user.wishlist.includes(venueId)) {
      return res.status(400).json({ message: 'Venue already in wishlist' });
    }

    user.wishlist.push(venueId);
    await user.save();

    res.status(200).json({ message: 'Venue added to wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
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

    res.status(200).json({ message: 'Venue removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
  }
};

// Get user's wishlist
export const getWishlist = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).populate({
      path: 'wishlist',
      populate: { path: 'category', select: 'name' },
    });

    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
  }
};

// ################################### add reply message api ####################################
export const addUserInquiryMessage = async (req, res) => {
  try {
   

    const { userId } = req.params;
    const { message, vendorId } = req.body;

    const userCheck = await User.findOne({ _id: userId });
    // console.log("userCheck",userCheck)
    if (!userCheck) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if an inquiry already exists
    let inquiry = await inquirySchema.findOne({ userId, vendorId });

    const messageEntry = {
      message: message,

    };

    if (inquiry) {
      // Add new message to existing inquiry
      inquiry.userMessage.push(messageEntry);
      await inquiry.save();
    } else {
      // Create a new inquiry
      inquiry = await inquirySchema.create({
        // name: userCheck.name,
        // email: userCheck.email,
        userId,
        vendorId,
        userMessage: [messageEntry]
      });
    }

    res.status(200).json({
      message: 'User inquiry saved successfully',
      result: inquiry
    });

  } catch (error) {
    
    res.status(500).json({
      message: 'Error saving user inquiry',
      error: error.message
    });
  }
};

// ############################### Get userinquiry List api ######################################

export const getUserInquiryList = async (req, res) => {
  try {
    
    const { userId } = req.body;
    // const userInquiryList = await userInquiry.find({email:email}).sort({ createdAt: -1 });
    const userInquiryList = await inquirySchema.find({ userId })
      .sort({ createdAt: -1 })
      .populate('vendorId', 'businessName');

    const modifiedList = userInquiryList.map((inquiry) => ({
      ...inquiry.toObject(),
      business: inquiry.vendorId?.businessName || null,
      vendorId: inquiry.vendorId?._id || null
    }));
    res.status(200).json({ message: 'User inquiry list fetched successfully', modifiedList });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user inquiry list', error: error.message });
  }
}
// ###################################  Update userinquiry api ####################################

export const updateUserInquiry = async (req, res) => {
  try {
    
    const { inquiryId } = req.params;
    if (!inquiryId) return res.status(404).json({ message: "Inquiry not found" });
    const { userId, weddingDate, message } = req.body;
    const updatedUserInquiry = await inquirySchema.findByIdAndUpdate(
      inquiryId,
      { userId, weddingDate, message },
      { new: true }
    );
    res.status(200).json({ message: 'User inquiry updated successfully', updatedUserInquiry });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user inquiry', error: error.message });
  }
}

// Update user password
export const updatePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    // Find user and include password field
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await user.isPasswordMatch(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update password using the User model's pre-save hook
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ message: "Error updating password", error: error.message });
  }
};

