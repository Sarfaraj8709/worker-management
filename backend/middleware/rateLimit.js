import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const jsonHandler = (message) => (req, res) => {
  res.status(429).json({ success: false, message });
};

/**
 * Global API limiter - coarse protection against flooding.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many requests, please try again later'),
});

/**
 * Strict limiter for credential endpoints (login / forgot-password /
 * resend verification). Keyed on IP + email so an attacker cannot
 * lock out a whole shared IP range, while per-account spraying is
 * still throttled.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    // ipKeyGenerator normalises IPv6 addresses so /64 blocks share one bucket
    `${ipKeyGenerator(req.ip)}:${String(req.body?.email || '').trim().toLowerCase()}`,
  handler: jsonHandler('Too many attempts. Please try again in 15 minutes'),
});

/**
 * Limiter for account-creation and email verification endpoints.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many attempts, please try again in an hour'),
});
