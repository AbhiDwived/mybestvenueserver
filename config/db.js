// config/db.js
import mongoose from 'mongoose';
import config from './config.js';

const connectWithRetry = async (retries = 5, interval = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(config.MONGO_URI, {
        // Connection pooling settings
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        
        // Connection settings
        useNewUrlParser: true,
        useUnifiedTopology: true,
        
        // Timeout settings
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        
        // Write concern settings
        w: 'majority',
        wtimeout: 2500,
        
        // Heartbeat settings
        heartbeatFrequencyMS: 10000,
      });

      console.log('✅ MongoDB Connected Successfully');
      
      // Monitor connection events
      mongoose.connection.on('error', err => {
        console.error('❌ MongoDB connection error:', err);
        reconnect();
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        reconnect();
      });

      return mongoose.connection;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        console.error('❌ Maximum retry attempts reached. Exiting...');
        process.exit(1);
      }
      
      console.log(`⏳ Retrying in ${interval/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

const reconnect = () => {
  console.log('🔄 Attempting to reconnect to MongoDB...');
  connectWithRetry(5, 5000).catch(err => {
    console.error('❌ Failed to reconnect to MongoDB:', err);
  });
};

// Create indexes for frequently queried fields
const createIndexes = async () => {
  try {
    const db = mongoose.connection;

    // Wait for connection to be ready
    await db.once('open', async () => {
      console.log('📑 Creating indexes...');

      // Users collection indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ phone: 1 });
      await db.collection('users').createIndex({ role: 1 });
      await db.collection('users').createIndex({ isVerified: 1 });

      // Vendors collection indexes
      await db.collection('vendors').createIndex({ email: 1 }, { unique: true });
      await db.collection('vendors').createIndex({ businessName: 1 });
      await db.collection('vendors').createIndex({ vendorType: 1 });
      await db.collection('vendors').createIndex({ isApproved: 1 });

      // Venues collection indexes
      await db.collection('venues').createIndex({ name: 1 });
      await db.collection('venues').createIndex({ location: '2dsphere' });
      await db.collection('venues').createIndex({ category: 1 });
      await db.collection('venues').createIndex({ price: 1 });

      // Inquiries collection indexes
      await db.collection('inquiries').createIndex({ user: 1 });
      await db.collection('inquiries').createIndex({ vendor: 1 });
      await db.collection('inquiries').createIndex({ status: 1 });
      await db.collection('inquiries').createIndex({ createdAt: 1 });

      console.log('✅ Indexes created successfully');
    });
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

const connectDB = async () => {
  try {
    const conn = await connectWithRetry();
    await createIndexes();
    return conn;
  } catch (error) {
    console.error('❌ Error in database initialization:', error);
    process.exit(1);
  }
};

export default connectDB;
