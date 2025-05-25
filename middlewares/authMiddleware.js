// server/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

const verifyToken = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization token missing or malformed' };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { decoded };
  } catch (err) {
    return { error: 'Token is invalid or expired' };
  }
};

// Add this for user verification
export const VerifyUser = (req, res, next) => {
  const { decoded, error } = verifyToken(req, res);
  if (error) return res.status(401).json({ message: error });
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


