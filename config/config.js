import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Server
  PORT: process.env.PORT || 5000,
  
  // MongoDB
  MONGO_URI: process.env.MONGO_URI,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7D',
  
  // Email
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100, // Limit each IP to 100 requests per window
  
  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
};

// Validate required configuration
const requiredConfig = [
  'MONGO_URI',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS'
];

const missingConfig = requiredConfig.filter(key => !config[key]);

if (missingConfig.length > 0) {
  throw new Error(`Missing required configuration: ${missingConfig.join(', ')}`);
}

export default config; 