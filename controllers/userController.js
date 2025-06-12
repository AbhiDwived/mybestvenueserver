import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import inquirySchema from '../models/Inquiry.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Register new user (with email OTP)
export const register = async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Convert to string
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log('Generated OTP:', otp); // Debug log

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
    });

    await newUser.save();

    // Verify OTP was saved correctly
    const savedUser = await User.findById(newUser._id).select('+otp +otpExpires');
    console.log('Saved user OTP:', savedUser.otp);

    // Send OTP via email
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
      subject: 'Your OTP for Registration',
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
      console.log('Email sent:', info.response);
    });

    res.status(201).json({
      message: 'Registration pending. OTP sent to email.',
      userId: newUser._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Verify OTP and complete registration
export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  console.log('--- VERIFY OTP DEBUG START ---');
  console.log('Received userId:', userId);
  console.log('Received raw OTP:', otp);

  try {
    // FIXED: Add .select('+otp +otpExpires') to include fields with select:false
    const user = await User.findById(userId).select('+otp +otpExpires');

    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found user:', {
      id: user._id,
      email: user.email,
      storedOtp: user.otp, // Now this will have a value
      otpExpires: user.otpExpires,
      isVerified: user.isVerified,
      now: new Date(),
    });

    // Step 2: Check if already verified
    if (user.isVerified) {
      console.log('User is already verified.');
      return res.status(400).json({ message: 'User already verified' });
    }

    // Step 3: Compare OTP and check expiration
    const trimmedOtp = otp?.toString().trim();
    const storedOtp = user.otp?.toString();

    // FIXED: Ensure both values are strings and properly compared
    const isOtpMatch = trimmedOtp === storedOtp;
    const isExpired = user.otpExpires < Date.now();

    console.log('OTP Match?', isOtpMatch ? '✅ Yes' : `❌ No (Expected "${storedOtp}", Got "${trimmedOtp}")`);
    console.log('OTP Expired?', isExpired ? '✅ Yes' : '❌ No');

    if (!isOtpMatch || isExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Step 4: Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    console.log('✅ OTP Verified Successfully. User marked as verified.');

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },  // <-- Add role here
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Registration completed successfully',
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

    console.log('--- VERIFY OTP DEBUG END ---\n');
  } catch (error) {
    console.error('🚨 Error verifying OTP:', error.message);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Resend OTP
export const resendOtp = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
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
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your New OTP for Registration',
      text: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    });

    res.status(200).json({
      message: 'New OTP sent to email.',
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};

// forgotPassword
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;

    user.markModified('otp');
    user.markModified('otpExpires');

    await user.save();

    console.log('🔐 OTP:', otp);
    console.log('🕒 OTP Expires:', new Date(otpExpires));
    console.log('📧 Email to be sent to:', user.email);

    // ✉️ SEND OTP VIA EMAIL
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      timeout: 10000
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your Password Reset OTP',
      text: `Your OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Error sending email:', error.message);
        console.error('Full error:', error); // Log full error object
        return res.status(500).json({ message: 'Failed to send OTP email' });
      }
      console.log('📨 Email sent successfully:', info.response);
    });

    res.status(200).json({
      message: 'OTP sent to email',
      userId: user._id
    });

  } catch (error) {
    console.error('🚨 Error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// verifyPasswordReset
export const verifyPasswordReset = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    // Include hidden fields explicitly
    const user = await User.findById(userId).select('+otp +otpExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const trimmedOtp = otp?.toString().trim();
    const storedOtp = user.otp?.toString();
    const isOtpMatch = trimmedOtp === storedOtp;
    const isExpired = user.otpExpires < Date.now();

    if (!isOtpMatch || isExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({
      message: 'OTP verified successfully',
      userId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// resetPassword
export const resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  try {
    // Include hidden fields explicitly
    const user = await User.findById(userId).select('+otp +otpExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP missing or expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear OTP
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'Password reset successful'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Make sure to select the password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified' });
    }

    // Debug log: show the payload that will be signed
    const payload = { id: user._id, email: user.email, role: user.role };
    console.log('Login token payload:', payload);

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
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
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone, address, city, state, country, profilePhoto } = req.body;

  try {
    // Find and update the user
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
        profilePhoto,
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        country: updatedUser.country,
        profilePhoto: updatedUser.profilePhoto,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
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

// add reply message api
export const addUserInquiryMessage = async (req, res) => {
  try {
    console.log("################### addReplyMessage Api Executed ###########################");

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
    console.log("error", error)
    res.status(500).json({
      message: 'Error saving user inquiry',
      error: error.message
    });
  }
};


// Get userinquiry List api 

export const getUserInquiryList = async (req, res) => {
  try {
    console.log("################### getUserInquiryList Api Executed ###########################");
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
// Update userinquiry api 

export const updateUserInquiry = async (req, res) => {
  try {
    console.log("################### updateUserInquiry Api Executed ###########################");
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

