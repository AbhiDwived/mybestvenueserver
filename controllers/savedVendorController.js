import SavedVendor from '../models/SavedVendor.js';
import Vendor from '../models/Vendor.js';
import mongoose from 'mongoose';

// Get all saved vendors for a user
export const getSavedVendors = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all saved vendor relationships for the user
    const savedVendors = await SavedVendor.find({ user: userId })
      .populate({
        path: 'vendor',
        select: 'businessName category location email profilePhoto averageRating reviewCount priceRange'
      })
      .sort({ createdAt: -1 });

    // Format the vendors for the response
    const formattedVendors = savedVendors.map(saved => {
      const vendor = saved.vendor;
      return vendor ? {
        id: vendor._id,
        name: vendor.businessName,
        category: vendor.category || 'Vendor',
        location: vendor.location || 'Location not specified',
        contactEmail: vendor.email,
        featuredImage: vendor.profilePhoto || 'https://via.placeholder.com/300x200?text=No+Image',
        rating: vendor.averageRating || 0,
        reviewCount: vendor.reviewCount || 0,
        priceRange: vendor.priceRange || '₹₹',
        savedAt: saved.createdAt,
      } : null;
    }).filter(Boolean); // Remove null entries if any vendor was deleted

    res.status(200).json({
      success: true,
      count: formattedVendors.length,
      data: formattedVendors,
    });
  } catch (error) {
    console.error('Error fetching saved vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Save a vendor
export const saveVendor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    // Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if already saved
    const existingSave = await SavedVendor.findOne({
      user: userId,
      vendor: vendorId,
    });

    if (existingSave) {
      return res.status(400).json({
        success: false,
        message: 'Vendor already saved',
      });
    }

    // Create new saved vendor record
    const savedVendor = new SavedVendor({
      user: userId,
      vendor: vendorId,
    });

    await savedVendor.save();

    res.status(201).json({
      success: true,
      message: 'Vendor saved successfully',
      data: {
        id: savedVendor._id,
        vendor: {
          id: vendor._id,
          name: vendor.businessName,
          category: vendor.category || 'Vendor',
        },
      },
    });
  } catch (error) {
    console.error('Error saving vendor:', error);
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Vendor already saved',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Unsave a vendor
export const unsaveVendor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    // Find and delete the saved vendor record
    const result = await SavedVendor.findOneAndDelete({
      user: userId,
      vendor: vendorId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Saved vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor removed from saved list',
    });
  } catch (error) {
    console.error('Error unsaving vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Check if a vendor is saved by the user
export const checkVendorSaved = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    // Check if vendor exists in saved list
    const savedVendor = await SavedVendor.findOne({
      user: userId,
      vendor: vendorId,
    });

    res.status(200).json({
      success: true,
      isSaved: !!savedVendor,
    });
  } catch (error) {
    console.error('Error checking saved vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
}; 