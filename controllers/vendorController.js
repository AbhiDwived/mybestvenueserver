import bcrypt from 'bcryptjs';
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor.js';
import inquirySchema from '../models/Inquiry.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import imagekit from '../config/imagekit.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { S3_BUCKET_NAME } from '../config/s3.js';

dotenv.config();

// Determine which storage service to use
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'imagekit';
import Package from '../models/Package.js';
import FAQ from '../models/Faq.js';
import Booking from '../models/Booking.js';
import { logUserLogin, logVendorProfileUpdate, logPackageUpdate } from '../utils/activityLogger.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/authMiddleware.js';

dotenv.config();

// In-memory store for pending vendor registrations
const pendingVendorRegistrations = {}; // { [email]: { vendorData, otp, otpExpires } }

// Helper function to extract file ID from ImageKit URL
const getImageKitFileId = (url) => {
  try {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const fileId = filename.split('_').pop();
    return fileId;
  } catch (error) {
    console.error('Error extracting ImageKit file ID:', error);
    return null;
  }
};

// Create vendor by admin (no OTP verification required)
export const createVendorByAdmin = async (req, res) => {
  const { businessName, businessType, vendorType, venueType, contactName, email, phone, password, serviceAreas, profilePictureUrl } = req.body;

  try {
    const vendorExists = await Vendor.findOne({ email });
    if (vendorExists) {
      return res.status(400).json({ message: 'Vendor already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Use the uploaded profile picture URL from S3/ImageKit
    let profilePicture = profilePictureUrl || null;

    const vendorData = {
      businessName,
      businessType: businessType || 'vendor',
      contactName,
      email,
      phone,
      password: hashedPassword,
      profilePicture,
      isVerified: true,
      isApproved: true,
      termsAccepted: true
    };

    // Handle serviceAreas
    if (req.body.serviceAreas) {
      try {
        vendorData.serviceAreas = typeof req.body.serviceAreas === 'string' ? JSON.parse(req.body.serviceAreas) : req.body.serviceAreas;
      } catch (error) {
        vendorData.serviceAreas = Array.isArray(req.body.serviceAreas) ? req.body.serviceAreas : [req.body.serviceAreas];
      }
    } else {
      vendorData.serviceAreas = [];
    }

    // Handle location fields
    if (req.body.city) vendorData.city = req.body.city;
    if (req.body.state) vendorData.state = req.body.state;
    if (req.body.country) vendorData.country = req.body.country;
    if (req.body.pinCode) vendorData.pinCode = req.body.pinCode;
    if (req.body.address) vendorData.address = req.body.address;
    if (req.body.nearLocation) vendorData.nearLocation = req.body.nearLocation;

    // Add type-specific fields
    if (businessType === 'vendor' || !businessType) {
      vendorData.vendorType = vendorType;
    } else if (businessType === 'venue') {
      vendorData.venueType = venueType;
    }

    const newVendor = new Vendor(vendorData);

    await newVendor.save();

    res.status(201).json({
      message: 'Vendor created successfully by admin',
      vendor: {
        id: newVendor._id,
        businessName: newVendor.businessName,
        businessType: newVendor.businessType,
        vendorType: newVendor.vendorType,
        venueType: newVendor.venueType,
        contactName: newVendor.contactName,
        email: newVendor.email,
        phone: newVendor.phone,
        profilePicture: newVendor.profilePicture,
        isApproved: newVendor.isApproved,
        isVerified: newVendor.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating vendor', error: error.message });
  }
};

// Register new vendor (with OTP)
export const registerVendor = async (req, res) => {
  const { businessName, businessType, vendorType, venueType, contactName, email, phone, password } = req.body;

  try {
    // Validate required fields
    if (!businessName || !businessType || !contactName || !email || !phone || !password) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Validate business type specific fields
    if (businessType === 'vendor' && !vendorType) {
      return res.status(400).json({ message: "Vendor type is required when business type is vendor" });
    }

    if (businessType === 'venue' && !venueType) {
      return res.status(400).json({ message: "Venue type is required when business type is venue" });
    }

    // Add email format validation
    const emailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Invalid email address" });
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

    // Handle profile picture - use ImageKit URL if available
    const profilePicture = req.imageUrl || null;

    // Create vendor data object
    const vendorData = {
      businessName,
      businessType,
      contactName,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
      termsAccepted: false,
      profilePicture
    };

    // Add type-specific fields
    if (businessType === 'vendor') {
      vendorData.vendorType = vendorType;
    } else if (businessType === 'venue') {
      vendorData.venueType = venueType;
    }

    // Create new vendor
    const newVendor = new Vendor(vendorData);

    // Handle serviceAreas and address separately to ensure proper parsing
    if (req.body.serviceAreas) {
      try {
        newVendor.serviceAreas = typeof req.body.serviceAreas === 'string' ? JSON.parse(req.body.serviceAreas) : req.body.serviceAreas;
      } catch (error) {
        console.error('Error parsing serviceAreas:', error);
        newVendor.serviceAreas = Array.isArray(req.body.serviceAreas) ? req.body.serviceAreas : [req.body.serviceAreas];
      }
    }

    // Handle address from individual form fields
    if (req.body.city || req.body.state || req.body.address) {
      newVendor.city = req.body.city || '';
      newVendor.state = req.body.state || '';
      newVendor.country = req.body.country || 'IN';
      newVendor.pinCode = req.body.pinCode || '';
      newVendor.address = req.body.address || '';
      newVendor.nearLocation = req.body.nearLocation || '';
    }

    // Prepare vendor data for temporary storage
    const tempVendorData = {
      businessName,
      businessType,
      contactName,
      email,
      phone,
      password: hashedPassword,
      profilePicture,
      isVerified: false,
      termsAccepted: false,
    };

    // Add type-specific fields
    if (businessType === 'vendor') {
      tempVendorData.vendorType = vendorType;
    } else if (businessType === 'venue') {
      tempVendorData.venueType = venueType;
    }

    // Handle serviceAreas and address separately to ensure proper parsing
    if (req.body.serviceAreas) {
      try {
        tempVendorData.serviceAreas = typeof req.body.serviceAreas === 'string' ? JSON.parse(req.body.serviceAreas) : req.body.serviceAreas;
      } catch (error) {
        console.error('Error parsing serviceAreas:', error);
        tempVendorData.serviceAreas = Array.isArray(req.body.serviceAreas) ? req.body.serviceAreas : [req.body.serviceAreas];
      }
    }

    // Handle address from individual form fields
    if (req.body.city || req.body.state || req.body.address) {
      tempVendorData.city = req.body.city || '';
      tempVendorData.state = req.body.state || '';
      tempVendorData.country = req.body.country || 'IN';
      tempVendorData.pinCode = req.body.pinCode || '';
      tempVendorData.address = req.body.address || '';
      tempVendorData.nearLocation = req.body.nearLocation || '';
    }

    // Store in pendingVendorRegistrations
    pendingVendorRegistrations[email] = {
      vendorData: tempVendorData,
      otp,
      otpExpires,
    };

    // Send OTP via email
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
      await sendEmail({
        email: email,
        subject: 'Your OTP for Vendor Registration',
        message: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      // Clean up pending registration if email fails
      delete pendingVendorRegistrations[email];
      return res.status(500).json({ message: 'Error sending OTP email' });
    }

    res.status(201).json({
      message: 'OTP sent to email. Please verify to activate your vendor account.',
      email, // Use email as identifier for OTP verification
    });

  } catch (error) {
    res.status(500).json({ message: 'Error registering vendor', error: error.message });
  }
};

// Verify OTP and complete registration (create vendor in DB only after OTP is verified)
export const verifyVendorOtp = async (req, res) => {
  const { email, otp } = req.body;

  console.log("--- VERIFY VENDOR OTP DEBUG START ---");
  console.log("Received email:", email);
  console.log("Received raw OTP:", otp);

  try {
    const pending = pendingVendorRegistrations[email];
    if (!pending) {
      console.log("No pending registration found for email:", email);
      return res.status(400).json({ message: "No pending registration found. Please register again." });
    }

    const trimmedOtp = otp?.toString().trim();
    const storedOtp = pending.otp?.toString();
    const isOtpMatch = trimmedOtp === storedOtp;
    const isExpired = pending.otpExpires < Date.now();

    console.log(
      "OTP Match?",
      isOtpMatch
        ? "✅ Yes"
        : `❌ No (Expected \"${storedOtp}\", Got \"${trimmedOtp}\")`
    );
    console.log("OTP Expired?", isExpired ? "✅ Yes" : "❌ No");

    if (!isOtpMatch || isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Create vendor in DB
    const newVendor = new Vendor({
      ...pending.vendorData,
      isVerified: true,
    });
    await newVendor.save();

    // Remove from pendingVendorRegistrations
    delete pendingVendorRegistrations[email];

    // Generate JWT token
    const token = jwt.sign(
      { id: newVendor._id, email: newVendor.email, role: newVendor.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Vendor registration completed successfully",
      token,
      vendor: {
        id: newVendor._id,
        businessName: newVendor.businessName,
        vendorType: newVendor.vendorType,
        contactName: newVendor.contactName,
        email: newVendor.email,
        phone: newVendor.phone,
        profilePicture: newVendor.profilePicture,
        isApproved: newVendor.isApproved,
        status: newVendor.status,
        role: newVendor.role,
      },
    });

    console.log("--- VERIFY VENDOR OTP DEBUG END ---\n");
  } catch (error) {
    console.error("🚨 Error verifying Vendor OTP:", error);
    res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};

// Resend vendor OTP
export const resendVendorOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // First, check if there is a pending registration (not yet in DB)
    if (pendingVendorRegistrations[email]) {
      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      pendingVendorRegistrations[email].otp = otp;
      pendingVendorRegistrations[email].otpExpires = otpExpires;

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
        to: email,
        subject: "Your New OTP for Vendor Registration",
        text: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          return res.status(500).json({ message: "Error sending OTP email" });
        }
        res.status(200).json({
          message: "New OTP sent to email.",
          email,
        });
      });
      return;
    }

    // If not in pendingVendorRegistrations, check if vendor exists in DB and is not verified
    const vendor = await Vendor.findOne({ email }).select("+otp +otpExpires +isVerified");
    if (!vendor) {
      return res.status(404).json({ message: "No pending registration or vendor found. Please register again." });
    }
    if (vendor.isVerified) {
      return res.status(400).json({ message: "Vendor already verified" });
    }

    // Generate new OTP for DB vendor (should rarely happen if pendingRegistrations is used correctly)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    vendor.otp = otp;
    vendor.otpExpires = otpExpires;
    await vendor.save();

    // Send OTP via email
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your New OTP for Vendor Registration",
      text: `Your new OTP is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Error sending OTP email" });
      }
      res.status(200).json({
        message: "New OTP sent to email.",
        email,
      });
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ 
      message: 'Error resending OTP', 
      error: error.message 
    });
  }
};

// Resend Password Reset OTP
export const resendPasswordResetOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // Find vendor by email
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ message: 'No vendor found with this email' });
    }

    // Generate new OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Save new OTP to vendor
    vendor.resetPasswordOtp = otp;
    vendor.resetPasswordOtpExpires = otpExpires;
    await vendor.save();

    // Send OTP via email
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
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

// Login vendor
export const loginVendor = async (req, res) => {
  
  const { email, password } = req.body;
  try {
    const vendor = await Vendor.findOne({ email }).select('+password');
    if (vendor) {
      const status = await Vendor.findOneAndUpdate({ email: vendor.email }, { status: "Active" }, { new: true });
    }

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    if (!vendor.isVerified) return res.status(403).json({ message: 'Email not verified' });

    const token = jwt.sign(
      { id: vendor._id, email: vendor.email, role: vendor.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log the login activity
    await logUserLogin({
      _id: vendor._id,
      name: vendor.businessName,
      role: 'vendor',
      email: vendor.email
    }, req);

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
        isApproved: vendor.isApproved,
        status: vendor.status,
        profilePicture: vendor.profilePicture || '',
        serviceAreas: vendor.serviceAreas,
      },
    });

  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Update vendor profile
export const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const updateData = {};
    
    console.log('🔍 Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Clean up any tab characters in keys
    for (const key in req.body) {
      const cleanKey = key.replace(/\t/g, '');
      if (cleanKey !== key) {
        req.body[cleanKey] = req.body[key];
        delete req.body[key];
      }
    }
    
    // Handle all fields except pricing
    for (const [key, value] of Object.entries(req.body)) {
      if (key !== 'pricing' && !key.startsWith('pricing[')) {
        updateData[key] = value;
      }
    }
    
    // Ensure businessType is properly handled
    if (req.body.businessType) {
      updateData.businessType = req.body.businessType;
      
      // Handle type-specific fields based on businessType
      if (req.body.businessType === 'venue') {
        if (req.body.venueType) {
          updateData.venueType = req.body.venueType;
        }
        // Remove vendorType if switching to venue
        updateData.$unset = { vendorType: 1 };
      } else if (req.body.businessType === 'vendor') {
        if (req.body.vendorType) {
          updateData.vendorType = req.body.vendorType;
        }
        // Remove venueType if switching to vendor
        updateData.$unset = { venueType: 1 };
      }
    }

    // Handle pricing data from multiple possible sources
    let pricingData = null;
    
    // Check if pricing is sent as array directly
    if (req.body.pricing && Array.isArray(req.body.pricing)) {
      pricingData = req.body.pricing;
      console.log('🔍 Found pricing as array:', pricingData);
    }
    // Check if pricing is sent as JSON string
    else if (req.body.pricing && typeof req.body.pricing === 'string') {
      try {
        pricingData = JSON.parse(req.body.pricing);
        console.log('🔍 Found pricing as JSON string:', pricingData);
      } catch (e) {
        console.log('❌ Failed to parse pricing JSON:', req.body.pricing);
      }
    }
    // Check form fields format
    else {
      const formPricing = [];
      let i = 0;
      while (req.body[`pricing[${i}][type]`] !== undefined) {
        const type = req.body[`pricing[${i}][type]`];
        const price = req.body[`pricing[${i}][price]`];
        const currency = req.body[`pricing[${i}][currency]`];
        const unit = req.body[`pricing[${i}][unit]`];
        formPricing.push({ type, price, currency, unit });
        i++;
      }
      if (formPricing.length > 0) {
        pricingData = formPricing;
        console.log('🔍 Found pricing as form fields:', pricingData);
      }
    }

    // Validate and filter pricing data
    if (pricingData && Array.isArray(pricingData)) {
      const validPricing = pricingData.filter(item => {
        const isValidType = item.type && String(item.type).trim().length > 0;
        const isValidPrice = item.price && 
                            String(item.price) !== 'null' && 
                            item.price !== null && 
                            String(item.price) !== '' && 
                            !isNaN(Number(item.price)) && 
                            Number(item.price) > 0;
        
        if (isValidType && isValidPrice) {
          return true;
        }
        console.log('❌ Filtered out invalid pricing:', item);
        return false;
      }).map(item => ({
        type: String(item.type).trim(),
        price: Number(item.price),
        currency: item.currency || 'INR',
        unit: item.unit || 'per person'
      }));

      if (validPricing.length > 0) {
        updateData.pricing = validPricing;
        console.log('✅ Setting valid pricing:', validPricing);
      }
    }

    // Handle address
    if (req.body.address !== undefined) {
      updateData.address = req.body.address;
    }
    
    // Remove pricing field completely if it exists but is invalid
    if ('pricing' in updateData && (!updateData.pricing || updateData.pricing.length === 0)) {
      delete updateData.pricing;
    }
    
    console.log('🔍 Final updateData:', JSON.stringify(updateData, null, 2));
    // Find the vendor first
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // If there's a new image uploaded via ImageKit
    if (req.fileUrl) {
      updateData.profilePicture = req.fileUrl;
    }

    // Prepare update operations
    const updateOperations = { $set: updateData };
    if (updateData.$unset) {
      updateOperations.$unset = updateData.$unset;
      delete updateData.$unset; // Remove from $set operation
    }

    // Update the vendor profile
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updateOperations,
      { new: true }
    );

    // Log the activity
    await logVendorProfileUpdate(vendor, updateData, req);

    // Return the complete updated vendor object
    console.log("✅ Vendor profile updated successfully", {
      vendorId,
      pricingCount: updateData.pricing?.length || 0,
      hasUnsetOperations: !!updateData.$unset
    });
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      vendor: updatedVendor,
      profilePicture: updatedVendor.profilePicture
    });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Delete vendor
export const deleteVendor = async (req, res) => {
  const { vendorId } = req.params.id;
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


// get Vendor by id ####################
export const getVendorById = async (req, res) => {
  const { vendorId } = req.params;

  try {
    const vendor = await Vendor.findOne({ _id: vendorId }); 
    if (!vendor) {
      
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

// ############################### addUserInquiry Reply by vendor ###############################


export const addVendorReplyToInquiry = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { userId, replyMessage } = req.body;

    if (!vendorId || !userId || !replyMessage) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the inquiry
    const inquiry = await inquirySchema.findOne({ vendorId, userId });

    if (!inquiry || !inquiry.userMessage.length) {
      return res.status(404).json({ message: "No inquiry found to reply" });
    }

    // Find the last user message that exists
    const lastUserMessage = [...inquiry.userMessage].reverse().find(msg => msg.message);

    if (!lastUserMessage) {
      return res.status(400).json({ message: "No user message found to reply" });
    }

    // Push new reply to the vendorReply array
    lastUserMessage.vendorReply.push({
      message: replyMessage,
      createdAt: new Date()
    });

    // Update reply status
    inquiry.replyStatus = "Replied";
    await inquiry.save();

    res.status(200).json({ message: "Vendor reply saved", result: inquiry });
  } catch (error) {
    console.error("Reply Save Error:", error);
    res.status(500).json({ message: "Error saving reply", error: error.message });
  }
};




export const getVendorRepliedInquiryList = async (req, res) => {
  try {
    // Extract vendorId from route params
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ message: 'Vendor ID is required in params' });
    }

    // Fetch all inquiries for this vendor where replyStatus is "Replied"
    const userInquiryList = await inquirySchema
      .find({ vendorId, })
      .sort({ updatedAt: -1 }) // most recent first
      .populate('userId', 'name'); // populate only the name from userId

    // Format the response to include user name
    const modifiedList = userInquiryList.map((inquiry) => ({
      ...inquiry.toObject(),
      name: inquiry.userId?.name || null,
      userId: inquiry.userId?._id || null
    }));

    res.status(200).json({
      message: 'Vendor replied inquiry list fetched successfully',
      data: modifiedList,
      inquiryCount: modifiedList.length
    });
  } catch (error) {
    console.error("Error in getVendorRepliedInquiryList:", error);
    res.status(500).json({
      message: 'Error fetching vendor inquiry list',
      error: error.message
    });
  }
};


//  Add Services Package 
export const addServicesPackage = async(req,res,next) =>{
  try{
   
    
    const {vendorId, packageName,description,price,offerPrice, services} = req.body;  
    const vendor = await Vendor.findOne({ _id: vendorId });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    const newPackage = new Package({
      vendorId,
      packageName,
      services,
      price,
      offerPrice,
      description,
    });
     const result =await newPackage.save();
    console.log('Package added successfully',result);
    res.status(200).json({ message: 'Package added successfully',result });
   
  }catch(error){
    console.log('Error adding package',error);
    res.status(500).json({ message: 'Error adding package', error: error.message });

  }
}

// get all Services Packages
export const getAllServicesPackages = async (req, res) => {
  
  try {
    const packages = await Package.find({valid:true}).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Packages fetched successfully', packages });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching packages', error: error.message });
  }
  
}
// get all Services Packages
export const getVendorServicesPackages = async (req, res) => {
  
  try {
    const { vendorId } = req.params;
    const packages = await Package.find({vendorId}).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Packages fetched successfully', packages });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching packages', error: error.message });
  }
  
}

//Update Services Package
export const updateServicePackages = async(req,res,nexxt)=>{
  
  try{
    const {packageId} = req.params;
    const {vendorId, packageName,description,price,offerPrice, services} = req.body;  
    const vendor = await Package.findOne({ _id: packageId });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    const result =await Package.findOneAndUpdate(
      {_id:packageId},
      {vendorId, packageName,description,price,offerPrice, services},
      {new:true});
    console.log('Package updated successfully',result);
    res.status(200).json({ message: 'Package updated successfully',result });
}catch(error){
  console.log('Error updating package',error);
  res.status(500).json({ message: 'Error updating package', error: error.message });
}
}

// Delete Services Package
export const deleteServicePackages = async(req,res,nexxt)=>{
  
  try{
    const {packageId} = req.params;
    const result =await Package.findByIdAndDelete(
      {_id:packageId},
      );
    console.log('Package deleted successfully',result);
    res.status(200).json({ message: 'Package deleted successfully',result });
}catch(error){
  console.log('Error deleting package',error);
  res.status(500).json({ message: 'Error deleting package', error: error.message });
}
}

// Add Faqs
export const addFaq = async(req,res,nexxt)=>{
  
  try{
    const {vendorId, question, answer} = req.body;  
    const result = await FAQ.create({
      vendorId,
      question,
      answer,
    });
    console.log('Faq added successfully',result);
    res.status(200).json({ message: 'Faq added successfully',result });
}catch(error){
  console.log('Error adding faq',error);
  res.status(500).json({ message: 'Error adding faq', error: error.message });
}
}

// getFaqs by getVendorsFaqs
export const getVendorsFaqs = async (req, res) => {

  try {
    const { vendorId } = req.params;
    const faqs = await FAQ.find({vendorId}).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Faqs fetched successfully', faqs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching faqs', error: error.message });
  }
}

// Delete Faqs
export const deleteFaq = async(req,res,next)=>{
  
  try{
    const {faqId,vendorId} = req.params;
     const result = await FAQ.findByIdAndDelete({_id:faqId,vendorId});
    // console.log('Faq deleted successfully',result);
    res.status(200).json({ message: 'Faq deleted successfully',result });
}catch(error){
  // console.log('Error deleting faq',error);
  res.status(500).json({ message: 'Error deleting faq', error: error.message });
}
}

// Update Vendor Pricing Range
export const updateVendorPricingRange = async (req, res) => {
  const { vendorId } = req.params;
  const { min, max, currency = 'INR' } = req.body;

  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Update pricing range
    vendor.pricingRange = {
      min: Number(min),
      max: Number(max),
      currency
    };

    await vendor.save();

    res.status(200).json({
      message: 'Pricing range updated successfully',
      vendor: {
        _id: vendor._id,
        businessName: vendor.businessName,
        pricingRange: vendor.pricingRange
      }
    });

  } catch (error) {
    console.error('Error updating pricing range:', error);
    res.status(500).json({ message: 'Error updating pricing range', error: error.message });
  }
};

// Update vendor package
export const updateVendorPackage = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { packageId } = req.params;
    const packageData = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    let action = packageId ? 'updated' : 'added';
    let updatedPackage;

    if (packageId) {
      // Update existing package
      updatedPackage = await Package.findByIdAndUpdate(
        packageId,
        { $set: packageData },
        { new: true }
      );
    } else {
      // Create new package
      const newPackage = new Package({
        ...packageData,
        vendor: vendorId
      });
      updatedPackage = await newPackage.save();
      action = 'added';
    }

    // Log the activity
    await logPackageUpdate(vendor, action, updatedPackage, req);

    res.status(200).json({
      success: true,
      message: `Package ${action} successfully`,
      package: updatedPackage
    });
  } catch (error) {
    console.error('Error updating vendor package:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update package',
      error: error.message
    });
  }
};



//  get User List By UserId 
export const getUserListById = async(req,res,next) => {
 
  try{
    const {userId} = req.params;
    const result =await User.findOne({ _id : userId });
    
    res.status(200).json({ message: 'User fetched successfully',result });
}catch(error){
  
  res.status(500).json({ message: 'Error fetching user', error: error.message }); 

}
}

// user Booking for  Vendor by vendor 

export const createuserBookingByVendor = async (req, res) => {
  
  try {
    const vendorId = req.user.id;

    const {
    
      userId,
      vendorName,
      eventType,
      eventDate,
      eventTime,
      venue,
      guestCount,
      plannedAmount,
      notes,
    } = req.body;

    // Validate required fields
    if (!vendorName || !eventType || !plannedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Vendor name, event type, and planned amount are required',
      });
    }

   
    // let user = null;
    if (userId) {
      console.log("userId",userId)
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid User ID',
        });
      }

      const user = await User.findById({_id:userId});
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'user not found',
        });
      }
    }

    // Create new booking
    const newBooking = new Booking({
      user: userId,
      vendor: vendorId || null,
      vendorName,
      eventType,
      eventDate: eventDate || null,
      eventTime: eventTime || null,
      venue: venue || '',
      guestCount: guestCount || 0,
      plannedAmount: Number(plannedAmount),
      spentAmount: 0,
      notes: notes || '',
    });

    await newBooking.save();

    res.status(200).json({
      success: true,
      data: newBooking,
      message: 'Booking created successfully by vendor ',
    });
  } catch (error) {
   
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
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

    const vendor = await Vendor.findById(decoded.id).select('-password');
    if (!vendor) {
      return res.status(401).json({ message: 'Vendor not found' });
    }

    // Generate new tokens
    const tokens = generateTokens({ id: vendor._id, email: vendor.email, role: 'vendor' });

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        profilePicture: vendor.profilePicture,
        role: 'vendor'
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Error refreshing token', error: error.message });
  }
};

// Portfolio management functions
export const uploadPortfolioImage = async (req, res) => {
  try {
    // Get vendorId - for admin from body/query, for vendor use their own ID
    let vendorId = req.user.role === 'admin' ? (req.body.vendorId || req.query.vendorId) : req.user.id;
    
    if (!req.fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Initialize portfolio array if it doesn't exist
    if (!vendor.portfolio) {
      vendor.portfolio = {
        images: [],
        videos: []
      };
    }
    
    // Add new image to portfolio
    vendor.portfolio.images.push({
      url: req.fileUrl,
      title: req.body.title || `Portfolio Image ${vendor.portfolio.images.length + 1}`,
      description: req.body.description || '',
      createdAt: new Date()
    });
    
    await vendor.save();
    

    
    res.status(200).json({
      success: true,
      message: 'Portfolio image uploaded successfully',
      image: vendor.portfolio.images[vendor.portfolio.images.length - 1]
    });
  } catch (error) {
    console.error('❌ Error uploading portfolio image:', {
      error: error.message,
      stack: error.stack,
      vendorId: req.body.vendorId,
      userRole: req.user?.role,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error during portfolio image upload',
      error: error.message,
      debug: {
        vendorId: req.body.vendorId,
        userRole: req.user?.role,
        userId: req.user?.id,
        hasFile: !!req.file,
        hasFileUrl: !!req.fileUrl
      }
    });
  }
};

export const getPortfolioImages = async (req, res) => {
  try {
    const { vendorId } = req.params;
    console.log('🖼️ Getting portfolio images for vendor:', vendorId);
    
    // Validate vendorId
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      console.log('❌ Invalid vendor ID:', vendorId);
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      console.log('❌ Vendor not found:', vendorId);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Return portfolio images
    const images = vendor.portfolio?.images || [];
    console.log('✅ Found', images.length, 'portfolio images for vendor:', vendorId);
    
    res.status(200).json({
      success: true,
      images
    });
  } catch (error) {
    console.error('❌ Error fetching portfolio images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const deletePortfolioImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    
    // Get vendorId - for vendors use their own ID, for admin use query param or find by image
    let vendorId;
    if (req.user.role === 'vendor') {
      vendorId = req.user.id;
    } else {
      vendorId = req.query.vendorId;
      if (!vendorId) {
        const vendorWithImage = await Vendor.findOne({ 'portfolio.images._id': imageId });
        vendorId = vendorWithImage?._id;
      }
    }
    
    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor not found' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.portfolio?.images) {
      return res.status(404).json({ success: false, message: 'Vendor or portfolio not found' });
    }
    
    const imageIndex = vendor.portfolio.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    vendor.portfolio.images.splice(imageIndex, 1);
    await vendor.save();
    
    res.status(200).json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting portfolio image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const uploadPortfolioVideo = async (req, res) => {
  try {
    // For admin, get vendorId from request body, for vendor use their own ID
    const vendorId = req.user.role === 'admin' ? req.body.vendorId : req.user.id;
    let videoUrl = req.body.url;
    const title = req.body.title || `Portfolio Video`;
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    // Handle file upload if a file is present
    if (req.file) {
      try {
        if (STORAGE_TYPE === 's3') {
          // Upload to S3
          const timestamp = Date.now();
          const fileName = `vendor_portfolio_video_${vendorId}_${timestamp}`;
          const folderPath = `vendors/${vendorId}/portfolio/videos`;
          const key = `${folderPath}/${fileName}`;

          // Upload to S3
          const params = {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
          };

          const command = new PutObjectCommand(params);
          await s3Client.send(command);

          // Generate S3 URL
          videoUrl = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        } else {
          // Upload file to ImageKit
          const uploadResponse = await imagekit.upload({
            file: req.file.buffer,
            fileName: `vendor_portfolio_video_${vendorId}_${Date.now()}`,
            folder: `vendors/${vendorId}/portfolio/videos`
          });

          // Use ImageKit URL
          videoUrl = uploadResponse.url;
        }
      } catch (uploadError) {
        console.error('Video Upload Error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload video',
          error: uploadError.message
        });
      }
    }

    // Validate video URL
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Video URL or file is required'
      });
    }
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Initialize portfolio array if it doesn't exist
    if (!vendor.portfolio) {
      vendor.portfolio = {
        images: [],
        videos: []
      };
    }
    
    // Add new video to portfolio
    const newVideo = {
      url: videoUrl,
      title: title,
      description: req.body.description || '',
      createdAt: new Date()
    };

    vendor.portfolio.videos.push(newVideo);
    
    await vendor.save();
    
    res.status(200).json({
      success: true,
      message: 'Portfolio video added successfully',
      video: newVideo
    });
  } catch (error) {
    console.error('Error adding portfolio video:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const getPortfolioVideos = async (req, res) => {
  try {
    const { vendorId } = req.params;
    console.log('🎥 Getting portfolio videos for vendor:', vendorId);
    
    // Validate vendorId
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      console.log('❌ Invalid vendor ID:', vendorId);
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      console.log('❌ Vendor not found:', vendorId);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Return portfolio videos
    const videos = vendor.portfolio?.videos || [];
    console.log('✅ Found', videos.length, 'portfolio videos for vendor:', vendorId);
    
    res.status(200).json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('❌ Error fetching portfolio videos:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const deletePortfolioVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    console.log('🗑️ Delete Portfolio Video Debug:', {
      videoId,
      userRole: req.user.role,
      userId: req.user.id,
      bodyVendorId: req.body.vendorId,
      queryVendorId: req.query.vendorId
    });
    
    // For admin, get vendorId from request body or query, for vendor use their own ID
    let vendorId = req.user.role === 'admin' ? (req.body.vendorId || req.query.vendorId) : req.user.id;
    
    // If admin but no vendorId provided, find the vendor by searching through all vendors for this video
    if (!vendorId && req.user.role === 'admin') {
      const vendorWithVideo = await Vendor.findOne({
        'portfolio.videos._id': videoId
      });
      
      if (vendorWithVideo) {
        vendorId = vendorWithVideo._id;
        console.log('✅ Found vendor by video ID:', vendorId);
      }
    }
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required for video deletion'
      });
    }
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Find the video in the portfolio
    if (!vendor.portfolio || !vendor.portfolio.videos) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }
    
    const videoIndex = vendor.portfolio.videos.findIndex(vid => vid._id.toString() === videoId);
    
    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Video not found in portfolio'
      });
    }
    
    // Get the video URL before removing it
    const videoToDelete = vendor.portfolio.videos[videoIndex];
    const videoUrl = videoToDelete.url;

    // Remove the video from the portfolio
    vendor.portfolio.videos.splice(videoIndex, 1);
    await vendor.save();
    
    // Delete the file from storage if it's hosted on our platforms
    if (videoUrl) {
      try {
        if (videoUrl.includes('amazonaws.com')) {
          // Extract S3 key from URL
          const urlObj = new URL(videoUrl);
          const key = urlObj.pathname.substring(1); // Remove leading slash
          
          // Delete from S3
          const params = {
            Bucket: S3_BUCKET_NAME,
            Key: key
          };
          
          const command = new DeleteObjectCommand(params);
          await s3Client.send(command);
        } else if (videoUrl.includes('imagekit.io')) {
          // Extract file ID from ImageKit URL
          const parts = videoUrl.split('/');
          const lastPart = parts[parts.length - 1];
          const fileId = lastPart.split('_').pop();
          
          if (fileId) {
            await imagekit.deleteFile(fileId);
          }
        }
      } catch (deleteError) {
        console.error('Error deleting file from storage:', deleteError);
        // Continue even if file deletion fails
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Portfolio video deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting portfolio video:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


export const getlatestVendorTypeData = async (req, res) => {
  try {
    const data = await Vendor.aggregate([
      
      { $sort: { createdAt: -1 } },

     
      {
        $group: {
          _id: "$vendorType",
          latestRecord: { $first: "$$ROOT" }
        }
      },

     
      {
        $replaceRoot: { newRoot: "$latestRecord" }
      }
    ]);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching latest vendorType data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete Pricing list value 
export const deletePricingList= async (req, res) => {
  const { vendorId, pricingId } = req.params;

  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Filter out the pricing item
    vendor.pricing = vendor.pricing.filter(item => item._id.toString() !== pricingId);

    await vendor.save();

    res.status(200).json({ message: 'Pricing item deleted', vendor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// For Similar Vendors List 
export const getSimilarVendors = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });  

    const similarVendors = await Vendor.find({ 
      vendorType: vendor.vendorType,
      _id: { $ne: vendorId }

     });

    res.status(200).json({ similarVendors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search Vendor by city
export const VendorsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    if (!city || typeof city !== 'string') {
      return res.status(400).json({ msg: 'City is required and must be a string' });
    }

    const normalizedInput = city.trim().toLowerCase().replace(/\s/g, '');
    const regex = new RegExp(`^${normalizedInput.split('').join('\\s*')}$`, 'i');

    const vendors = await Vendor.find({
      city: { $regex: regex }
    })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Vendor.countDocuments({
      city: { $regex: regex }
    });

    if (vendors.length === 0) {
      return res.status(404).json({ msg:`No vendors found for ${city}` });
    }

    res.status(200).json({
      msg: `Vendors found for ${city}`,
      vendors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error in VendorsByCity:', error);
    res.status(500).json({ message: 'Server error' });
  }
};