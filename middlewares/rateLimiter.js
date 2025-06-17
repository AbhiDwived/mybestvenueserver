import rateLimit from 'express-rate-limit';
import { clientErrorResponse } from '../utils/responseHandler.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    clientErrorResponse(res, 429, 'Too many requests from this IP, please try again later.');
  }
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login attempts per hour
  message: 'Too many authentication attempts, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    clientErrorResponse(res, 429, 'Too many login attempts. Account temporarily locked.');
  }
});

// Rate limiter for password reset attempts
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    clientErrorResponse(res, 429, 'Too many password reset attempts. Please try again later.');
  }
});

// Rate limiter for OTP verification
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP verification attempts per 15 minutes
  message: 'Too many OTP verification attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    clientErrorResponse(res, 429, 'Too many OTP verification attempts. Please try again later.');
  }
}); 