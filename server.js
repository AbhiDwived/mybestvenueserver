// /server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';  // Ensure .js extension for local imports
import userRoutes from './routes/userRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import venueRoutes from './routes/venueRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import activityRoutes from './routes/activityRoutes.js';


dotenv.config();  // Load environment variables from .env file

connectDB();  // Connect to MongoDB

const app = express();

// Middleware to handle CORS, JSON requests, and cookies
app.use(
  cors({
    origin: 'https://mybestvenue.com/', // Match your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie', '*'],
  })
);



app.use(express.json());
app.use(cookieParser());

// API Versioning Routes
app.use('/api/v1/user', userRoutes);   // Route for user operations
app.use('/api/v1/vendor', vendorRoutes); // Route for vendor operations
app.use('/api/v1/admin', adminRoutes);   // Route for admin operations
app.use('/api/v1/venue', venueRoutes);
app.use('/api/v1/category', categoryRoutes);
app.use('/api/v1/activity', activityRoutes);


// Error Handling Middleware (should be last)
app.use(errorHandler);

// Temporary route for testing
app.get('/', (req, res) => {
  res.send('API Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
