// DATABASE OPTIMIZATION FIXES

// 1. Add indexes to frequently queried fields
const addDatabaseIndexes = async () => {
  try {
    // User collection indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phone: 1 });
    
    // Vendor collection indexes
    await Vendor.collection.createIndex({ email: 1 }, { unique: true });
    await Vendor.collection.createIndex({ vendorType: 1 });
    await Vendor.collection.createIndex({ "address.city": 1 });
    await Vendor.collection.createIndex({ isApproved: 1, isActive: 1 });
    
    // Inquiry collection indexes
    await Inquiry.collection.createIndex({ userId: 1, vendorId: 1 });
    await Inquiry.collection.createIndex({ vendorId: 1, createdAt: -1 });
    
    // Booking collection indexes
    await Booking.collection.createIndex({ userId: 1, createdAt: -1 });
    await Booking.collection.createIndex({ vendorId: 1, eventDate: 1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// 2. Database connection pooling optimization
const optimizedDBConfig = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,        // Maximum number of connections
  minPoolSize: 2,         // Minimum number of connections
  maxIdleTimeMS: 30000,   // Close connections after 30 seconds of inactivity
  retryWrites: true,
  retryReads: true,
  bufferMaxEntries: 0,    // Disable mongoose buffering
  bufferCommands: false,  // Disable mongoose buffering
};

// 3. Query optimization patterns
const optimizedQueries = {
  // Use lean() for read-only operations
  getVendors: () => Vendor.find({ isActive: true }).lean(),
  
  // Use select() to limit fields
  getVendorsList: () => Vendor.find({ isActive: true })
    .select('businessName vendorType address pricing')
    .lean(),
  
  // Use pagination for large datasets
  getVendorsPaginated: (page = 1, limit = 10) => 
    Vendor.find({ isActive: true })
      .select('businessName vendorType address')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(),
};

export { addDatabaseIndexes, optimizedDBConfig, optimizedQueries };