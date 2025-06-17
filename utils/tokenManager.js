import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import crypto from 'crypto';

// Token types
const TokenType = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

// Standard expiration times
const TokenExpiration = {
  ACCESS: '7D',  // Updated from 15m to 7D
  REFRESH: '14D'  // Updated from 7d to 14D for refresh token
};

// Store for blacklisted tokens (in production, use Redis instead)
const tokenBlacklist = new Set();

// Store for CSRF tokens (in production, use Redis instead)
const csrfTokens = new Map();

// Generate CSRF token
export const generateCSRFToken = (userId) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(userId, {
    token: csrfToken,
    timestamp: Date.now()
  });
  return csrfToken;
};

// Verify CSRF token
export const verifyCSRFToken = (userId, token) => {
  const storedData = csrfTokens.get(userId);
  if (!storedData) return false;
  
  // Clean up old token
  csrfTokens.delete(userId);
  
  // Check if token is expired (24 hours)
  if (Date.now() - storedData.timestamp > 24 * 60 * 60 * 1000) {
    return false;
  }
  
  return storedData.token === token;
};

export const generateTokens = (userId, email, role) => {
  // Generate access token with shorter expiration
  const accessToken = jwt.sign(
    { 
      id: userId, 
      email, 
      role, 
      type: TokenType.ACCESS,
      iat: Math.floor(Date.now() / 1000)
    },
    config.JWT_SECRET,
    { expiresIn: TokenExpiration.ACCESS }
  );

  // Generate refresh token with rotation
  const refreshToken = jwt.sign(
    { 
      id: userId, 
      email, 
      role, 
      type: TokenType.REFRESH,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(16).toString('hex') // Unique token ID for rotation
    },
    config.JWT_SECRET,
    { expiresIn: TokenExpiration.REFRESH }
  );

  // Generate CSRF token
  const csrfToken = generateCSRFToken(userId);

  return { accessToken, refreshToken, csrfToken };
};

export const verifyToken = (token) => {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Check token expiration with buffer time (30 seconds)
    const bufferTime = 30;
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (decoded.exp - currentTime < bufferTime) {
      throw new Error('Token is about to expire');
    }

    return { decoded };
  } catch (error) {
    return { error: error.message };
  }
};

export const refreshAccessToken = (refreshToken) => {
  try {
    const { decoded, error } = verifyToken(refreshToken);
    if (error) throw new Error(error);

    if (decoded.type !== TokenType.REFRESH) {
      throw new Error('Invalid token type');
    }

    // Blacklist the used refresh token (token rotation)
    blacklistToken(refreshToken);

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, csrfToken } = generateTokens(
      decoded.id,
      decoded.email,
      decoded.role
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, csrfToken };
  } catch (error) {
    return { error: error.message };
  }
};

export const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // In production, set expiration for blacklisted tokens
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000); // Clean up after 24 hours
};

// Clean up expired CSRF tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of csrfTokens.entries()) {
    if (now - data.timestamp > 24 * 60 * 60 * 1000) {
      csrfTokens.delete(userId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
}; 