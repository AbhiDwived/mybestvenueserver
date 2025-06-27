import bcrypt from 'bcryptjs';
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor.js';
import inquirySchema from '../models/Inquiry.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import imagekit from '../config/imagekit.js';
import Package from '../models/Package.js';
import FAQ from '../models/Faq.js';
import Booking from '../models/Booking.js';
import { logUserLogin, logVendorProfileUpdate, logPackageUpdate } from '../utils/activityLogger.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/authMiddleware.js';

dotenv.config();

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

    // Handle profile picture - use ImageKit URL if available
    const profilePicture = req.imageUrl || null;

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
      { expiresIn: '1h' }
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
    // Find vendor by email
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ message: 'No vendor found with this email' });
    }

    // Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Save OTP to vendor
    vendor.resetPasswordOtp = otp;
    vendor.resetPasswordOtpExpires = otpExpires;
    await vendor.save();

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

// Verify OTP for Password Reset
export const verifyVendorResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find vendor by email
    const vendor = await Vendor.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');
    if (!vendor) {
      return res.status(404).json({ message: 'No vendor found with this email' });
    }

    // Check OTP
    const isMatch = otp.toString().trim() === vendor.resetPasswordOtp?.toString();
    const isExpired = vendor.resetPasswordOtpExpires < Date.now();

    if (!isMatch || isExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP fields
    vendor.resetPasswordOtp = undefined;
    vendor.resetPasswordOtpExpires = undefined;
    await vendor.save();

    res.status(200).json({
      message: 'OTP verified successfully',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Reset Vendor Password
export const resetVendorPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Find vendor by email
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ message: 'No vendor found with this email' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    vendor.password = hashedPassword;
    await vendor.save();

    res.status(200).json({
      message: 'Password reset successfully',
    });

  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
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
      subject: 'New Password Reset OTP',
      text: `Your new OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    });

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
    const updateData = req.body;

    // Find the vendor first
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // If there's a new image uploaded via ImageKit
    if (req.fileUrl) {
      updateData.profilePicture = req.fileUrl;
    }

    // Update the vendor profile
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: updateData },
      { new: true }
    );

    // Log the activity
    await logVendorProfileUpdate(vendor, updateData, req);

    // Return the complete updated vendor object
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      vendor: updatedVendor,
      profilePicture: updatedVendor.profilePicture // Explicitly include the profile picture URL
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


export const addUserInquiryReply = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { message, userId, messageId } = req.body;

    if (!vendorId || !userId || !messageId || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Ensure vendor exists
    const vendorCheck = await Vendor.findById(vendorId);
    if (!vendorCheck) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Find the inquiry with that user and message ID
    
    const inquiry = await inquirySchema.findOneAndUpdate(
      {
        vendorId: vendorId,
        userId: userId,
        "userMessage._id": messageId
      },
      {
        $set: {
          "userMessage.$[elem].vendorReply": {
            message: message,
          },
          replyStatus: "Replied"
        }
      },
      {
        arrayFilters: [
          { "elem._id": messageId }
        ],
        new: true
      }
    );


    
    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found for the messageId" });
    }



    res.status(200).json({
      message: "Vendor reply saved successfully",
      data: inquiry
    });

  } catch (error) {
    console.log("error", error)
    res.status(500).json({
      message: "Error saving vendor reply",
      error: error.message
    });
  }
};


// Get Vendorreplied Inquiry List
export const getVendorRepliedInquiryList = async (req, res) => {
  try {
    // Get vendorId from authenticated user
    const vendorId = req.user.id;

    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized: Vendor ID not found' });
    }

    const userInquiryList = await inquirySchema.find({ vendorId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name');

    const modifiedList = userInquiryList.map((inquiry) => ({
      ...inquiry.toObject(),
      name: inquiry.userId?.name || null,
      userId: inquiry.userId?._id || null
    }));
    
    res.status(200).json({ message: 'Vendor reply list fetched successfully', modifiedList });
  } catch (error) {
    
    res.status(500).json({ message: 'Error fetching user inquiry list', error: error.message });
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
    const vendorId = req.user.id;
    
    if (!req.fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
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
    console.error('Error uploading portfolio image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const getPortfolioImages = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Return portfolio images
    const images = vendor.portfolio?.images || [];
    
    res.status(200).json({
      success: true,
      images
    });
  } catch (error) {
    console.error('Error fetching portfolio images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const deletePortfolioImage = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { imageId } = req.params;
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Find the image in the portfolio
    if (!vendor.portfolio || !vendor.portfolio.images) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }
    
    const imageIndex = vendor.portfolio.images.findIndex(img => img._id.toString() === imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in portfolio'
      });
    }
    
    // Get the image URL to delete from ImageKit
    const imageUrl = vendor.portfolio.images[imageIndex].url;
    
    // Delete from ImageKit if it's an ImageKit URL
    if (imageUrl && imageUrl.includes('imagekit')) {
      try {
        const fileId = getImageKitFileId(imageUrl);
        if (fileId) {
          await imagekit.deleteFile(fileId);
        }
      } catch (error) {
        console.error('Error deleting image from ImageKit:', error);
        // Continue with deletion from database even if ImageKit deletion fails
      }
    }
    
    // Remove the image from the portfolio
    vendor.portfolio.images.splice(imageIndex, 1);
    await vendor.save();
    
    res.status(200).json({
      success: true,
      message: 'Portfolio image deleted successfully'
    });
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
    const vendorId = req.user.id;
    let videoUrl = req.body.url;
    const title = req.body.title || `Portfolio Video`;

    // Handle file upload if a file is present
    if (req.file) {
      try {
        // Upload file to ImageKit
        const uploadResponse = await imagekit.upload({
          file: req.file.buffer,
          fileName: `vendor_portfolio_video_${vendorId}_${Date.now()}`,
          folder: `/vendors/${vendorId}/portfolio/videos`
        });

        // Use ImageKit URL
        videoUrl = uploadResponse.url;
      } catch (uploadError) {
        console.error('Video Upload to ImageKit Error:', uploadError);
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
    
    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    // Return portfolio videos
    const videos = vendor.portfolio?.videos || [];
    
    res.status(200).json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('Error fetching portfolio videos:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const deletePortfolioVideo = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { videoId } = req.params;
    
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
    
    // Remove the video from the portfolio
    vendor.portfolio.videos.splice(videoIndex, 1);
    await vendor.save();
    
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


