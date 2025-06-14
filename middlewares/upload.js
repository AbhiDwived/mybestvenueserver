import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the upload directory based on the route
    let uploadDir = 'uploads/';
    
    if (req.originalUrl.includes('/vendor')) {
      uploadDir += 'vendors/';
    } else if (req.originalUrl.includes('/user')) {
      uploadDir += 'users/';
    } else if (req.originalUrl.includes('/admin')) {
      uploadDir += 'admin/';
    }

    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default upload;
