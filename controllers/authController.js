import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    let user = await User.findOne({ email });
    let userType = 'user';

    if (!user) {
      user = await Vendor.findOne({ email });
      userType = 'vendor';
    }

    if (!user) {
      return res.status(404).json({ message: 'No user or vendor found with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

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
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    });

    res.status(200).json({
      message: 'OTP sent to your email for password reset',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error processing forgot password', error: error.message });
  }
};

export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    let user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');
    if (!user) {
      user = await Vendor.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');
    }

    if (!user) {
      return res.status(404).json({ message: 'No user or vendor found with this email' });
    }

    const isMatch = otp.toString().trim() === user.resetPasswordOtp?.toString();
    const isExpired = user.resetPasswordOtpExpires < Date.now();

    if (!isMatch || isExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

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

export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = await Vendor.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: 'No user or vendor found with this email' });
    }

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