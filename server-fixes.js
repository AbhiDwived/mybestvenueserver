// CRITICAL SERVER FIXES - Apply these immediately

// 1. FIX: Database connection with proper retry limits
const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 5;
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10, // Limit connection pool
      minPoolSize: 2,
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

// 2. FIX: Memory management with cleanup
let memoryInterval;
const startMemoryMonitoring = () => {
  if (memoryInterval) clearInterval(memoryInterval);
  
  memoryInterval = setInterval(() => {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    
    // Alert if memory usage is too high
    if (heapUsedMB > 500) { // 500MB threshold
      logger.warn(`High memory usage: ${heapUsedMB}MB`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.info('Forced garbage collection');
      }
    }
    
    logger.info('Memory usage:', {
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${heapUsedMB}MB`,
      external: `${Math.round(used.external / 1024 / 1024)}MB`
    });
  }, 300000);
};

// 3. FIX: Proper process handlers
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, {
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Cleanup and exit immediately
  if (memoryInterval) clearInterval(memoryInterval);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    promise: promise,
    reason: reason,
    timestamp: new Date().toISOString()
  });
  
  // Don't exit, but monitor for patterns
});

// 4. FIX: Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (memoryInterval) clearInterval(memoryInterval);
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (memoryInterval) clearInterval(memoryInterval);
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

// 5. FIX: Better rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Increased to 50 attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 6. FIX: Request timeout handling
app.use(timeout('60s')); // Increased to 60 seconds
app.use((req, res, next) => {
  if (!req.timedout) {
    next();
  } else {
    logger.error('Request timeout:', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    res.status(408).json({ message: 'Request timeout' });
  }
});

// 7. FIX: Health check with detailed info
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    },
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  res.status(200).json(health);
});

export { connectDB, startMemoryMonitoring };