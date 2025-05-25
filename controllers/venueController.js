import Venue from '../models/Venue.js';
import Category from '../models/Category.js';

// Create a new venue (by vendor)
export const createVenue = async (req, res) => {
  try {
    const { name, location, capacity, priceRange, description, images, category } = req.body;
    const vendorId = req.user.id; // From VerifyVendor middleware

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const newVenue = new Venue({
      name,
      location,
      capacity,
      priceRange,
      description,
      images,
      category,
      vendor: vendorId,
    });

    const savedVenue = await newVenue.save();

    res.status(201).json({
      message: 'Venue created and pending approval',
      venue: savedVenue,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating venue', error: error.message });
  }
};

// Get all approved venues (public, with optional filtering)
export const getApprovedVenues = async (req, res) => {
  try {
    const { category, city, minPrice, maxPrice } = req.query;
    const filter = { isApproved: true };

    if (category) filter.category = category;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (minPrice || maxPrice) {
      filter['priceRange.min'] = { $gte: Number(minPrice) || 0 };
      if (maxPrice) {
        filter['priceRange.max'] = { $lte: Number(maxPrice) };
      }
    }

    const venues = await Venue.find(filter)
      .populate('category', 'name')
      .populate('vendor', 'businessName email');

    res.status(200).json({ venues });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching venues', error: error.message });
  }
};

// Get single venue by ID (public)
export const getVenueById = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId)
      .populate('category', 'name')
      .populate('vendor', 'businessName email');

    if (!venue || !venue.isApproved) {
      return res.status(404).json({ message: 'Venue not found or not approved' });
    }

    res.status(200).json({ venue });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching venue', error: error.message });
  }
};

// Admin approves a venue
export const approveVenue = async (req, res) => {
  try {
    const venue = await Venue.findByIdAndUpdate(
      req.params.venueId,
      { isApproved: true },
      { new: true }
    );

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    res.status(200).json({ message: 'Venue approved', venue });
  } catch (error) {
    res.status(500).json({ message: 'Error approving venue', error: error.message });
  }
};

// Update a venue (by vendor only)
export const updateVenue = async (req, res) => {
  const { venueId } = req.params;
  const vendorId = req.user.id;

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    if (venue.vendor.toString() !== vendorId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    Object.assign(venue, req.body);
    venue.isApproved = false; // Re-approval needed

    const updatedVenue = await venue.save();

    res.status(200).json({
      message: 'Venue updated (pending approval)',
      venue: updatedVenue,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating venue', error: error.message });
  }
};

// Delete a venue (by vendor only)
export const deleteVenue = async (req, res) => {
  const { venueId } = req.params;
  const vendorId = req.user.id;

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    if (venue.vendor.toString() !== vendorId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await venue.deleteOne();

    res.status(200).json({ message: 'Venue deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting venue', error: error.message });
  }
};

// Get all approved venues with filters, pagination, and sorting
export const getFilteredVenues = async (req, res) => {
  try {
    const {
      category,
      city,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = { isApproved: true };

    if (category) filter.category = category;
    if (city) filter.location = { $regex: new RegExp(city, 'i') };
    if (minPrice || maxPrice) {
      filter.priceRange = {};
      if (minPrice) filter.priceRange.$gte = Number(minPrice);
      if (maxPrice) filter.priceRange.$lte = Number(maxPrice);
    }

    const venues = await Venue.find(filter)
      .populate('category', 'name')
      .populate('vendor', 'businessName')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Venue.countDocuments(filter);

    res.status(200).json({
      venues,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching filtered venues', error: error.message });
  }
};


