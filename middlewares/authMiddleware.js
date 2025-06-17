// server/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor.js';

const verifyToken = (req, res) => {
  console.log('Authorization header:', req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization token missing or malformed' };
  }

  const token = authHeader.split(' ')[1];

  console.log('Token to verify:', token);
  console.log('JWT secret:', process.env.JWT_SECRET ? 'Loaded' : 'Missing');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);
    return { decoded };
  } catch (err) {
    console.error('❌ Token verification error:', err.message);
    return { error: 'Token is invalid or expired' };
  }
};

// Add this for user verification
export const VerifyUser = (req, res, next) => {
  const { decoded, error } = verifyToken(req, res);
  if (error) return res.status(401).json({ message: error });

  console.log('Decoded token:', decoded);

  if (!decoded.role) {
    console.log('Role missing in token!');
  } else if (decoded.role !== 'user') {
    console.log(`Role is not user, it is: ${decoded.role}`);
  }

  if (decoded.role !== 'user') {
    return res.status(403).json({ message: 'Access denied: Not a user' });
  }

  req.user = decoded;
  next();
};

// Add this for vendor verification
export const VerifyVendor = (req, res, next) => {
  const { decoded, error } = verifyToken(req, res);
  if (error) return res.status(401).json({ message: error });
  if (decoded.role !== 'vendor') {
    return res.status(403).json({ message: 'Access denied: Not a vendor' });
  }
  req.user = decoded;
  next();
};

// Add this for admin verification
export const VerifyAdmin = (req, res, next) => {
  const { decoded, error } = verifyToken(req, res);
  if (error) return res.status(401).json({ message: error });
  if (decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Not an admin' });
  }
  req.user = decoded;
  next();
};

// ✅ Check if Vendor is Approved
export const CheckVendorApproval = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.user.id); // ✅ Use Vendor model
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

