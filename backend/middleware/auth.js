import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * The JWT secret must come exclusively from the environment. No
 * hardcoded fallback: verification fails closed if it is missing.
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Server misconfiguration: JWT_SECRET is missing or too short');
  }
  return secret;
};

// Protect routes
export const protect = async (req, res, next) => {
  // The session lives exclusively in an HttpOnly cookie.
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route, token missing' });
  }

  try {
    // Verify token signature & expiry
    const decoded = jwt.verify(token, getJwtSecret());

    // Get user from DB (include passwordChangedAt for session invalidation)
    const user = await User.findById(decoded.id).select('+passwordChangedAt');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Reject sessions issued before the last password change
    if (
      user.passwordChangedAt &&
      decoded.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      return res
        .status(401)
        .json({ success: false, message: 'Password recently changed. Please log in again.' });
    }

    // Disabled / suspended accounts cannot use existing sessions either
    if (!user.isActive || user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This account has been disabled' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`Auth Middleware Error: ${error.name}: ${error.message}`);
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this resource`,
      });
    }
    next();
  };
};
