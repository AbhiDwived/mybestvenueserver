// /server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import budgetRoutes from './routes/budgetRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import checklistRoutes from './routes/checklistRoutes.js';
import savedVendorRoutes from './routes/savedVendorRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import subscriberRoutes from './routes/subscriberRoutes.js';
import sitemapRoutes from './routes/sitemapRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import timeout from 'connect-timeout';
import compression from 'compression';
import morgan from 'morgan';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { logger, stream } from './utils/logger.js';
import { cacheMiddleware } from './middlewares/cache.js';
import inquiryRoutes from './routes/inquiryRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname,'dir')

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Use Morgan for HTTP request logging
const app = express();
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined', { stream }));
}

dotenv.config();  // Load environment variables from .env file

connectDB();  // Connect to MongoDB

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Enable compression for all responses
app.use(compression());

// Trust proxy for secure cookies in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, {
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  // Give the server time to handle existing connections before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: promise,
    reason: reason,
    timestamp: new Date().toISOString()
  });
  // Don't exit the process, just log the error
});

// Monitor memory usage and log it
setInterval(() => {
  const used = process.memoryUsage();
  logger.info('Memory usage:', {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`
  });
}, 300000); // Log every 5 minutes

// Adjust rate limits to be more generous
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500
  message: 'Too many requests from this IP, please try again later.'
});

// Stricter rate limits for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 5 to 20
  message: 'Too many login attempts, please try again later.'
});
app.use('/api/', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Middleware to handle CORS, JSON requests, and cookies
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://mybestvenue.com',
        'https://www.mybestvenue.com'
      ];
      
      // Block requests with no origin (like direct API access)
      if (!origin) {
        return callback(null, true); // or false to block
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  })
);

// Add timeout middleware (30 seconds)
app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// Increase payload limits with conditions
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf.length > 10 * 1024 * 1024) {
      throw new Error('Payload too large');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use((req, res, next) => {
  res.cookie('sessionId', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  next();
});

// Serve uploads folder statically
app.use('/uploads', express.static('uploads'));

// Add sitemap routes before other routes
app.use('/', sitemapRoutes);

// Apply caching to public routes that don't change frequently
app.use('/api/v1/category', cacheMiddleware(3600)); // Cache categories for 1 hour
app.use('/api/v1/venue', cacheMiddleware(1800));    // Cache venues for 30 minutes
app.use('/api/v1/blog', cacheMiddleware(3600));     // Cache blogs for 1 hour

// API Versioning Routes
app.use('/api/v1/user', userRoutes);  
app.use('/api/v1/vendor', vendorRoutes); 
app.use('/api/v1/admin', adminRoutes);   
app.use('/api/v1/venue', venueRoutes);
app.use('/api/v1/category', categoryRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/blog', blogRoutes); 
app.use('/api/v1/admin/blog', adminBlogRoutes); 
app.use('/api/v1/budget', budgetRoutes);
app.use('/api/v1/booking', bookingRoutes);
app.use('/api/v1/checklist', checklistRoutes);
app.use('/api/v1/saved-vendors', savedVendorRoutes);
app.use('/api/v1/guest', guestRoutes);
app.use('/api/v1/subscriber', subscriberRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/reviews', reviewRoutes);

// Error Handling Middleware (should be last)
app.use(errorHandler);

// Temporary route for testing
app.get('/', (req, res) => {
  res.send('API Running');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

