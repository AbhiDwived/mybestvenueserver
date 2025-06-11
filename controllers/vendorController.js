import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Register new vendor (with OTP)
export const registerVendor = async (req, res) => {
  const { businessName, vendorType, contactName, email, phone, password } = req.body;

  try {
    // Validate required fields
    if (!businessName || !vendorType || !contactName || !email || !phone || !password) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if vendor already exists
    const vendorExists = await Vendor.findOne({ email });
    if (vendorExists) {
      return res.status(400).json({ message: 'Vendor already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Handle profile picture
    const profilePicture = req.file ? `/uploads/vendors/${req.file.filename}` : null;

    // Create new vendor
    const newVendor = new Vendor({
      businessName,
      vendorType,
      contactName,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
      termsAccepted: false,
      profilePicture,
    });

    await newVendor.save();

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
      subject: 'Your OTP for Vendor Registration',
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    });

    res.status(201).json({
      message: 'Vendor registration pending. OTP sent to email.',
      vendorId: newVendor._id,
    });

  } catch (error) {
    res.status(500).json({ message: 'Error registering vendor', error: error.message });
  }
};

// Verify vendor OTP
export const verifyVendorOtp = async (req, res) => {
  const { vendorId, otp } = req.body;
  try {
    const vendor = await Vendor.findById(vendorId).select('+otp +otpExpires');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (vendor.isVerified) return res.status(400).json({ message: 'Vendor already verified' });

    const isMatch = otp.toString().trim() === vendor.otp?.toString();
    const isExpired = vendor.otpExpires < Date.now();

    if (!isMatch || isExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    vendor.isVerified = true;
    vendor.otp = undefined;
    vendor.otpExpires = undefined;
    await vendor.save();

const token = jwt.sign(
  { id: vendor._id, email: vendor.email, role: vendor.role },
  process.env.JWT_SECRET,
  { expiresIn: '7D' }
);

    res.status(200).json({
      message: 'Vendor verified successfully',
      token,
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
        vendorType: vendor.vendorType,
        contactName: vendor.contactName,
        email: vendor.email,
        phone: vendor.phone,
        role: vendor.role,
         profilePicture: vendor.profilePicture,  // Add this line
      },
    });

  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Resend vendor OTP
export const resendVendorOtp = async (req, res) => {
  const { vendorId } = req.body;
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (vendor.isVerified) return res.status(400).json({ message: 'Vendor already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    vendor.otp = otp;
    vendor.otpExpires = otpExpires;
    await vendor.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: vendor.email,
      subject: 'Your New Vendor OTP',
      text: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    });

    res.status(200).json({
      message: 'New OTP sent to email.',
      vendorId: vendor._id,
    });

  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};

// Forgot Password - Send OTP
export const vendorForgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    vendor.otp = otp;
    vendor.otpExpires = otpExpires;
    await vendor.save();

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
      subject: 'Vendor Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    });

    return res.status(200).json({
      message: 'OTP sent to your registered email address',
      vendorId: vendor._id
    });

  } catch (error) {
    res.status(500).json({ message: 'Error in forgot password', error: error.message });
  }
};

// Verify Password Reset OTP
export const verifyVendorResetOtp = async (req, res) => {
  const { vendorId, otp } = req.body;
  try {
    const vendor = await Vendor.findById(vendorId).select('+otp +otpExpires');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const isMatch = otp.toString().trim() === vendor.otp?.toString();
    const isExpired = vendor.otpExpires < Date.now();

    if (!isMatch || isExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ message: 'OTP verified. You can now reset your password.' });

  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Reset Password
export const resetVendorPassword = async (req, res) => {
  const { vendorId, newPassword } = req.body;
  try {
    const vendor = await Vendor.findById(vendorId).select('+password');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    vendor.password = hashedPassword;
    vendor.otp = undefined;
    vendor.otpExpires = undefined;
    await vendor.save();

    res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Login vendor
export const loginVendor = async (req, res) => {
  console.log("#######################Login Vendor Api Executed######################")
  const { email, password } = req.body;
  try {
    const vendor = await Vendor.findOne({ email }).select('+password');
    if(vendor){
    const status = await Vendor.findOneAndUpdate({ email: vendor.email }, { status:"Active" },{new: true});
      // console.log("Status",status)
  }

    
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    if (!vendor.isVerified) return res.status(403).json({ message: 'Email not verified' });

const token = jwt.sign(
  { id: vendor._id, email: vendor.email, role: vendor.role },
  process.env.JWT_SECRET,
  { expiresIn: '7D' }
);

    res.status(200).json({
  message: 'Login successful',
  token,
  vendor: {
    id: vendor._id,
    businessName: vendor.businessName,
    vendorType: vendor.vendorType,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    role: vendor.role,
     profilePicture: vendor.profilePicture,  // Add this line
    isApproved: vendor.isApproved, // ✅ Add this line
    status: vendor.status
  },
});

  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Update vendor profile
export const updateVendorProfile = async (req, res) => {
  const { vendorId } = req.params;
  const profilePicture = req.file?.path;
  // return console.log("profilePicture", profilePicture);
  const {
    businessName,
    vendorType,
    contactName,
    email,
    phone,
    address,
    isApproved,
    serviceAreas,
    description,
    yearsInBusiness,
    licenses,
    pricing,
    website,
    socialMedia,
    media,
    paymentDetails,
    termsAccepted,
    
  } = req.body;

  try {
    console.log("################### Update Vendor Api Executed #################")
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        businessName,
        vendorType,
        contactName,
        email,
        phone,
        address,
        isApproved,
        serviceAreas,
        description,
        yearsInBusiness,
        licenses,
        pricing,
        website,
        socialMedia,
        media,
        paymentDetails,
        termsAccepted,
        profilePicture:profilePicture
      },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.status(200).json({
      message: 'Vendor profile updated successfully',
      vendor: updatedVendor,
    });

  } catch (error) {
    console.log("error", error)
    res.status(500).json({ message: 'Error updating vendor', error: error.message });
  }
};

// Delete vendor
export const deleteVendor = async (req, res) => {
  const { vendorId } = req.params;
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(vendorId);
    if (!deletedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.status(200).json({
      message: 'Vendor deleted successfully',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
};


// get Vendor by id 
export const getVendorById = async (req, res) => {
  const { vendorId } = req.params;

  try {
    const vendor = await Vendor.findById(vendorId); // <-- FIXED LINE
    if (!vendor) {
      console.log('Vendor not found  for Id:', vendorId);
      return res.status(404).json({ message: 'Vendor not found' });


    }

    res.status(200).json({
      message: 'Vendor found successfully',
      vendor,
    });    
  } catch (error) {
    res.status(500).json({ message: 'Error getting vendor', error: error.message });
  }        
};