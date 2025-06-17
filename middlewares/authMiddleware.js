// server/middlewares/authMiddleware.js
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js';
import AppError from '../utils/AppError.js';
import { authErrorResponse, forbiddenResponse } from '../utils/responseHandler.js';
import { verifyToken, isTokenBlacklisted } from '../utils/tokenManager.js';

const extractAndVerifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided or token is malformed', 401);
  }

  const token = authHeader.split(' ')[1];

  // Check if token is blacklisted
  if (isTokenBlacklisted(token)) {
    throw new AppError('Token has been revoked', 401);
  }

  const { decoded, error } = verifyToken(token);
  if (error) {
    throw new AppError(error, 401);
  }

  // Verify token type
  if (decoded.type !== 'access') {
    throw new AppError('Invalid token type', 401);
  }

  return decoded;
};

// User verification middleware
export const VerifyUser = async (req, res, next) => {
  try {
    const decoded = extractAndVerifyToken(req);
    
    // Verify user exists and is active
    const user = await User.findById(decoded.id).select('+isActive');
    if (!user || !user.isActive) {
      return authErrorResponse(res, 'User not found or inactive');
    }

    if (decoded.role !== 'user') {
      return forbiddenResponse(res, 'Access denied: Not a user');
    }

    req.user = decoded;
    next();
  } catch (error) {
    return authErrorResponse(res, error.message);
  }
};

// Vendor verification middleware
export const VerifyVendor = async (req, res, next) => {
  try {
    const decoded = extractAndVerifyToken(req);
    
    // Verify vendor exists and is active
    const vendor = await Vendor.findById(decoded.id).select('+isActive');
    if (!vendor || !vendor.isActive) {
      return authErrorResponse(res, 'Vendor not found or inactive');
    }

    if (decoded.role !== 'vendor') {
      return forbiddenResponse(res, 'Access denied: Not a vendor');
    }

    req.user = decoded;
    next();
  } catch (error) {
    return authErrorResponse(res, error.message);
  }
};

// Admin verification middleware
export const VerifyAdmin = async (req, res, next) => {
  try {
    const decoded = extractAndVerifyToken(req);
    
    // Verify admin exists and is active
    const admin = await Admin.findById(decoded.id).select('+isActive');
    if (!admin || !admin.isActive) {
      return authErrorResponse(res, 'Admin not found or inactive');
    }

    if (decoded.role !== 'admin') {
      return forbiddenResponse(res, 'Access denied: Not an admin');
    }

    req.user = decoded;
    next();
  } catch (error) {
    return authErrorResponse(res, error.message);
  }
};

// Check if Vendor is Approved
export const CheckVendorApproval = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    
    if (!vendor || vendor.role !== 'vendor') {
      return forbiddenResponse(res, 'Access denied: Not a valid vendor');
    }
    
    if (!vendor.isApproved) {
      return forbiddenResponse(res, 'Access denied: Vendor not approved. Please contact admin.');
    }
    
    next();
  } catch (error) {
    return authErrorResponse(res, error.message);
  }
};

// Role-based access control middleware
export const CheckRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return forbiddenResponse(res, 'You do not have permission to perform this action');
    }
    next();
  };
};

