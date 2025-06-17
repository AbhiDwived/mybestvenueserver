export default {
  // File size limits
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,

  // Allowed file types
  allowedFileTypes: {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  },

  // Upload directories
  uploadDir: 'uploads',
  backupDir: 'uploads/backup',
  tempDir: 'uploads/temp',

  // Cleanup settings
  tempFileLifetime: 3600000, // 1 hour in milliseconds
  cleanupInterval: 3600000, // Run cleanup every hour

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxUploads: 10 // Max uploads per IP per window
  }
}; 