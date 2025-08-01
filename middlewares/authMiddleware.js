// server/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js';

// Generate tokens
export const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check user type and set appropriate user data
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
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    next();
  };
};

// Add this for user verification
export const VerifyUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    if (!decoded.role) {
      console.log('Role missing in token!');
      return res.status(403).json({ message: 'Access denied: Invalid token format' });
    } else if (decoded.role !== 'user') {
      console.log(`Role is not user, it is: ${decoded.role}`);
      return res.status(403).json({ message: 'Access denied: Not a user' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Add this for vendor verification
export const VerifyVendor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader); // Debug log
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // Debug log
    if (decoded.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied: Not a vendor' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.log('JWT verification error:', err); // Debug log
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Add this for admin verification
export const VerifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Not an admin' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// ✅ Check if Vendor is Approved (Admin bypass allowed)
export const CheckVendorApproval = async (req, res, next) => {
  try {
    // Allow admin to bypass vendor approval check
    if (req.user.role === 'admin') {
      console.log('✅ Admin bypassing vendor approval check');
      return next();
    }
    
    const vendor = await Vendor.findById(req.user.id); // ✅ Use Vendor model
    if (!vendor || vendor.role !== 'vendor') {
      console.log('❌ Vendor not found or invalid role:', { vendorExists: !!vendor, role: vendor?.role });
      return res.status(403).json({ message: 'Access denied: Not a valid vendor' });
    }
    if (!vendor.isApproved) {
      console.log('❌ Vendor not approved:', vendor.businessName);
      return res.status(403).json({ message: 'Access denied: Vendor not approved. Please contact admin.' });
    }
    console.log('✅ Vendor approval check passed:', vendor.businessName);
    next();
  } catch (err) {
    console.error('❌ Error in vendor approval check:', err);
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

    // If user is an admin, always grant access
    if (decoded.role === 'admin') {
      return next();
    }

    // If user is a vendor, always grant access (they can only access their own data anyway)
    if (decoded.role === 'vendor') {
      return next();
    }

    // If neither admin nor vendor, deny access
    return res.status(403).json({ message: 'Access denied' });
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Check that this function is properly exported
export const protect = async (req, res, next) => {
  // Implementation...
};
