// config/db.js
import mongoose from 'mongoose';

const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 5;
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log('MongoDB Connected');

    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      if (retryCount < MAX_RETRIES) {
        console.log(`MongoDB disconnected. Retry ${retryCount + 1}/${MAX_RETRIES}`);
        setTimeout(() => connectDB(retryCount + 1), 5000 * (retryCount + 1));
      } else {
        console.error('Max reconnection attempts reached. Server needs restart.');
        process.exit(1);
      }
    });

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => connectDB(retryCount + 1), 5000 * (retryCount + 1));
    } else {
      console.error('MongoDB connection failed permanently:', error.message);
      process.exit(1);
    }
  }
};

export default connectDB;
