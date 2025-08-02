import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/weddingwire');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix businessType for existing vendors
const fixBusinessType = async () => {
  try {
    // Get all vendors without businessType
    const vendors = await Vendor.find({ businessType: { $exists: false } });
    console.log(`Found ${vendors.length} vendors without businessType`);

    for (const vendor of vendors) {
      const businessName = (vendor.businessName || '').toLowerCase();
      
      // Determine if it's a venue based on name
      const isVenue = businessName.includes('banquet') ||
                     businessName.includes('hotel') ||
                     businessName.includes('resort') ||
                     businessName.includes('farmhouse') ||
                     businessName.includes('farm') ||
                     businessName.includes('venue') ||
                     businessName.includes('hall') ||
                     businessName.includes('garden') ||
                     businessName.includes('palace') ||
                     businessName.includes('manor') ||
                     businessName.includes('residency') ||
                     businessName.includes('grand') ||
                     businessName.includes('plaza') ||
                     businessName.includes('inn') ||
                     businessName.includes('suites');

      // Update vendor with appropriate businessType
      await Vendor.findByIdAndUpdate(vendor._id, {
        businessType: isVenue ? 'venue' : 'vendor',
        ...(isVenue && !vendor.venueType && { venueType: 'Banquet Hall' }),
        ...(!isVenue && !vendor.vendorType && { vendorType: 'Event Services' })
      });

      console.log(`Updated ${vendor.businessName}: ${isVenue ? 'venue' : 'vendor'}`);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the migration
const runMigration = async () => {
  await connectDB();
  await fixBusinessType();
};

runMigration();