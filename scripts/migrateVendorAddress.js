import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from '../models/Vendor.js';

dotenv.config();

const migrateVendorAddresses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all vendors
    const vendors = await Vendor.find({});
    console.log(`Found ${vendors.length} vendors to migrate`);

    for (const vendor of vendors) {
      try {
        // If address is a string, convert it to object format
        if (typeof vendor.address === 'string') {
          vendor.address = {
            city: vendor.address,
            state: 'Not Specified',
            street: '',
            country: 'India',
            zipCode: ''
          };
          await vendor.save();
          console.log(`Successfully migrated vendor: ${vendor._id}`);
        }
      } catch (error) {
        console.error(`Error migrating vendor ${vendor._id}:`, error);
      }
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateVendorAddresses(); 