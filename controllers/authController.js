/**
 * Authentication Controller
 * 
 * This controller handles authentication-related operations including:
 * - Password reset functionality for both users and vendors
 * - OTP verification for password reset
 * - Email notifications for password reset
 * 
 * @author Wedding Wire Team
 * @version 1.0.0
 */

import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { sendEmail } from '../utils/sendEmail.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Forgot password: Send OTP to user or vendor email
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Try to find user by email (first in User, then in Vendor)
    let user = await User.findOne({ email });
    let userType = 'user';

    if (!user) {
      user = await Vendor.findOne({ email });
      userType = 'vendor';
    }

    if (!user) {
      return res.status(404).json({ message: 'No user or vendor found with this email' });
    }

    // Generate 6-digit OTP and set expiry (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Save OTP and expiry to user/vendor document
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    // Send OTP email using the centralized sendEmail utility
    try {
      await sendEmail({
        email: email,
        subject: 'Password Reset OTP',
        message: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ message: 'Error sending OTP email' });
    }

    res.status(200).json({
      message: 'OTP sent to your email for password reset',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error processing forgot password', error: error.message });
  }
};

// Verify password reset OTP for user or vendor
export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find user or vendor by email, include OTP fields
    let user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');
    if (!user) {
      user = await Vendor.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');
    }

    if (!user) {
      return res.status(404).json({ message: 'No user or vendor found with this email' });
    }

    // Check both OTP match and expiry
    const isMatch = otp.toString().trim() === user.resetPasswordOtp?.toString();
    const isExpired = user.resetPasswordOtpExpires < Date.now();

    if (!isMatch || isExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP fields after successful verification
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'OTP verified successfully',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Reset password after OTP verification
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Find user or vendor by email
    let user = await User.findOne({ email });
    if (!user) {
      user = await Vendor.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: 'No user or vendor found with this email' });
    }

    // Always hash new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: 'Password reset successfully',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Resend password reset OTP for user or vendor
export const resendPasswordResetOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // Find user or vendor by email
    let user = await User.findOne({ email });
    let userType = 'user';

    if (!user) {
      user = await Vendor.findOne({ email });
      userType = 'vendor';
    }

    if (!user) {
      return res.status(404).json({ message: 'No user or vendor found with this email' });
    }

    // Generate new OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Save new OTP to user/vendor
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    // Send OTP via email
    try {
      await sendEmail({
        email: email,
        subject: 'New Password Reset OTP',
        message: `Your new OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ message: 'Error sending OTP email' });
    }

    res.status(200).json({
      message: 'New OTP sent to your email',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};
