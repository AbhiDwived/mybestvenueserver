// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log('MongoDB Connected');

    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      // Don't exit process, try to reconnect instead
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000); // Try to reconnect after 5 seconds
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    // Don't exit process immediately, try to reconnect
    setTimeout(connectDB, 5000); // Try to reconnect after 5 seconds
  }
};

export default connectDB;
