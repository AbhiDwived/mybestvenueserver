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
import blogRoutes from './routes/blogRoutes.js';
import adminBlogRoutes from './routes/adminBlogRoutes.js';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname,'dir')

dotenv.config();  // Load environment variables from .env file

connectDB();  // Connect to MongoDB

const app = express();

// Middleware to handle CORS, JSON requests, and cookies

const allowedOrigins = [
  'http://localhost:5173',
  'https://mybestvenue.com'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie']
  })
);



app.use(express.json());
app.use(cookieParser());

// Serve uploads folder statically
app.use('/uploads', express.static('uploads'));

// API Versioning Routes
app.use('/api/v1/user', userRoutes);  
app.use('/api/v1/vendor', vendorRoutes); 
app.use('/api/v1/admin', adminRoutes);   
app.use('/api/v1/venue', venueRoutes);
app.use('/api/v1/category', categoryRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/blog', blogRoutes); 
app.use('/api/v1/admin/blog', adminBlogRoutes); 


// Error Handling Middleware (should be last)
app.use(errorHandler);

// Temporary route for testing
app.get('/', (req, res) => {
  res.send('API Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

