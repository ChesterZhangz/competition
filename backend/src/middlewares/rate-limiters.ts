import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Key generator that uses userId if authenticated, otherwise falls back to IP.
 * This prevents shared IP issues (e.g., classroom/office with NAT).
 */
const getUserOrIpKey = (req: Request): string => {
  // If user is authenticated, use their userId
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP for unauthenticated requests
  // Use req.ip which express-rate-limit handles properly
  return `ip:${req.ip || 'unknown'}`;
};

// General rate limiter for all requests
// Increased limits for competition scenarios where many users share same IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 per user/IP per 15 minutes
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  skip: (req: Request) => {
    // Skip rate limiting for WebSocket upgrade requests
    return req.headers.upgrade === 'websocket';
  },
});

// Auth rate limiter for login/register
// Uses IP-based limiting to prevent credential stuffing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased from 10 to 20 attempts per IP
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Auth uses IP-only since user isn't authenticated yet
});

// Strict limiter for sensitive endpoints (e.g., password reset, admin actions)
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Increased from 10 to 20 per minute
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
});

// Competition-specific limiter with higher limits
// For endpoints that are heavily used during competitions
export const competitionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per user
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  skip: (req: Request) => {
    // Skip for WebSocket connections
    return req.headers.upgrade === 'websocket';
  },
});
