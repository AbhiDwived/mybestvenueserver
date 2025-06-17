import express from 'express';
import { refreshAccessToken, blacklistToken } from '../utils/tokenManager.js';
import { successResponse, authErrorResponse } from '../utils/responseHandler.js';
import catchAsync from '../utils/catchAsync.js';

const router = express.Router();

// Refresh access token
router.post('/refresh-token', catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return authErrorResponse(res, 'Refresh token is required');
  }

  const { accessToken, error } = refreshAccessToken(refreshToken);
  
  if (error) {
    return authErrorResponse(res, error);
  }

  return successResponse(res, 200, 'Access token refreshed successfully', { accessToken });
}));

// Logout (blacklist token)
router.post('/logout', catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    blacklistToken(token);
  }

  // Also blacklist refresh token if provided
  const { refreshToken } = req.body;
  if (refreshToken) {
    blacklistToken(refreshToken);
  }

  return successResponse(res, 200, 'Logged out successfully');
}));

export default router;
