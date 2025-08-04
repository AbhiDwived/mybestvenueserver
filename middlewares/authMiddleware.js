// server/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js';

// Generate tokens
export const generateTokens = (payload) => {
  //  Generate both access and refresh tokens with different secrets and expiry
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  //  Verify refresh token using refresh secret, return decoded or null
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

// Middleware to verify access token
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    //  Require Bearer token in Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    //  Check user type and set appropriate user data on req.user
    let user;
    switch (decoded.role) {
      case 'user':
        user = await User.findById(decoded.id).select('-password');
        break;
      case 'vendor':
        user = await Vendor.findById(decoded.id).select('-password');
        break;
      case 'admin':
        user = await Admin.findById(decoded.id).select('-password');
        break;
      default:
        return res.status(401).json({ message: 'Invalid user type' });
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  //  Allow only users with specified roles to proceed
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    next();
  };
};

// Verify user (role: user)
export const VerifyUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //  Only allow if role is user
    if (!decoded.role) {
      return res.status(403).json({ message: 'Access denied: Invalid token format' });
    } else if (decoded.role !== 'user') {
      return res.status(403).json({ message: 'Access denied: Not a user' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Verify vendor (role: vendor)
export const VerifyVendor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //  Only allow if role is vendor
    if (decoded.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied: Not a vendor' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Verify admin (role: admin)
export const VerifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //  Only allow if role is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Not an admin' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Check if Vendor is Approved (Admin bypass allowed)
export const CheckVendorApproval = async (req, res, next) => {
  try {
    //  Allow admin to bypass vendor approval check
    if (req.user.role === 'admin') {
      return next();
    }
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied: Not a valid vendor' });
    }
    if (!vendor.isApproved) {
      return res.status(403).json({ message: 'Access denied: Vendor not approved. Please contact admin.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Server error during approval check' });
  }
};

// Middleware to verify if the user is an admin or the correct vendor
export const VerifyAdminOrVendor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    //  Allow admin or vendor to proceed, deny others
    if (decoded.role === 'admin' || decoded.role === 'vendor') {
      return next();
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Placeholder for protect middleware (implement as needed)
export const protect = async (req, res, next) => {
  //  Implement additional protection logic if needed
  // ...existing code...
};
