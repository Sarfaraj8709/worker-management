import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User, { DUMMY_PASSWORD_HASH } from '../models/User.js';
import WorkerProfile from '../models/WorkerProfile.js';
import { protect } from '../middleware/auth.js';
import sendEmail from '../utils/sendEmail.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Session lifetime: JWT expiry and cookie maxAge are kept identical.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

/**
 * The JWT secret must come exclusively from the environment.
 * There is deliberately NO hardcoded fallback - if the secret is
 * missing the server refuses to sign or verify tokens (fail closed),
 * instead of silently using a publicly known key.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Server misconfiguration: JWT_SECRET is missing or too short');
  }
  return secret;
};

const buildVerificationUrl = (token) =>
  `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${token}`;

const buildResetUrl = (token) =>
  `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;

// Simple branded HTML body with a big action button, used for all emails.
const buildActionEmailHtml = ({ title, intro, url, buttonText, footer }) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h2 style="color:#0f172a;margin:0 0 12px;">${title}</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;">${intro}</p>
      <p style="text-align:center;margin:0 0 24px;">
        <a href="${url}"
           style="background:#10b981;color:#ffffff;text-decoration:none;font-weight:bold;
                  padding:14px 28px;border-radius:999px;display:inline-block;font-size:15px;">
          ${buttonText}
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
        If the button doesn't work, copy this link into your browser:
      </p>
      <p style="word-break:break-all;"><a href="${url}" style="color:#10b981;font-size:13px;">${url}</a></p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:24px 0 0;">${footer}</p>
    </div>
  </div>`;

// Issue the session as an HttpOnly cookie ONLY. The raw JWT is never
// placed in the JSON body, so client-side JavaScript cannot read it.
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    getJwtSecret(),
    { expiresIn: SESSION_TTL_SECONDS }
  );

  res
    .status(statusCode)
    .cookie('token', token, {
      maxAge: SESSION_TTL_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    .json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        isVerified: user.isVerified,
      },
    });
};

const isStrongEnough = (password) =>
  typeof password === 'string' && password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);

// @desc    Register user or worker (role escalation impossible:
//          only 'user' and 'worker' may be self-assigned)
// @route   POST /api/auth/register
// @access  Public, rate limited
router.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password, phone, role, address, skills, serviceArea } = req.body;

  // Only these roles can ever be created through public registration.
  const safeRole = ['user', 'worker'].includes(role) ? role : 'user';

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }

  if (!isStrongEnough(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and contain letters and numbers',
    });
  }

  try {
    let user = await User.findOne({ email: String(email).toLowerCase() });
    if (user) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    user = await User.create({
      name,
      email,
      password,
      phone,
      role: safeRole,
      address,
    });

    if (safeRole === 'worker') {
      const skillsArray = Array.isArray(skills) ? skills : skills ? [skills] : [];
      await WorkerProfile.create({
        userId: user._id,
        skills: skillsArray,
        serviceArea: serviceArea || address?.pincode || '',
        isAvailable: true,
        jobsCompleted: 0,
      });
    }

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      text: `Welcome ${user.name}!\n\nPlease verify your email address by opening this link within 24 hours:\n${buildVerificationUrl(verificationToken)}\n\nIf you did not create this account you can ignore this email.`,
      html: buildActionEmailHtml({
        title: `Welcome, ${user.name}!`,
        intro: 'Please verify your email address to activate your account. The link is valid for <b>24 hours</b>.',
        url: buildVerificationUrl(verificationToken),
        buttonText: 'Verify Email Address',
        footer: 'If you did not create this account you can safely ignore this email.',
      }),
    });

    // No session is issued until the email address is verified.
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account before logging in.',
    });
  } catch (error) {
    console.error(`Register Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to complete registration' });
  }
});

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired. Please request a new one.',
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Ownership of the mailbox is proven -> issuing the session here is safe.
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(`Verify Email Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to verify email' });
  }
});

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public, rate limited
router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide your email' });
  }

  try {
    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Generic response either way so accounts cannot be enumerated.
    if (user && !user.isVerified) {
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      await sendEmail({
        to: user.email,
        subject: 'Verify your email',
        text: `Please verify your email address by opening this link within 24 hours:\n${buildVerificationUrl(verificationToken)}`,
        html: buildActionEmailHtml({
          title: 'Verify your email',
          intro: 'Please verify your email address to activate your account. The link is valid for <b>24 hours</b>.',
          url: buildVerificationUrl(verificationToken),
          buttonText: 'Verify Email Address',
          footer: 'If you did not request this, you can safely ignore this email.',
        }),
      });
    }

    res.status(200).json({
      success: true,
      message: 'If that account exists and is unverified, a verification email has been sent.',
    });
  } catch (error) {
    console.error(`Resend Verification Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to send verification email' });
  }
});

// @desc    Login user, worker, or admin
// @route   POST /api/auth/login
// @access  Public, rate limited
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    const user = await User.findOne({ email: String(email).toLowerCase() }).select(
      '+password'
    );

    // Run a bcrypt compare even when the account does not exist so the
    // response time doesn't reveal which emails are registered.
    const isMatch = user
      ? await user.matchPassword(password)
      : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

    if (!user || !isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive || user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This account has been disabled' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(`Login Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to log in' });
  }
});

// @desc    Forgot password - emails a short-lived, single-use reset link
// @route   POST /api/auth/forgot-password
// @access  Public, rate limited
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide your email' });
  }

  try {
    const user = await User.findOne({ email: String(email).toLowerCase() });

    if (user && user.isActive && user.status !== 'suspended') {
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      await sendEmail({
        to: user.email,
        subject: 'Password reset request',
        text: `You requested a password reset.\n\nOpen this link within 10 minutes to choose a new password:\n${buildResetUrl(resetToken)}\n\nIf you did not request this, ignore this email - your password remains unchanged.`,
        html: buildActionEmailHtml({
          title: 'Password reset request',
          intro: 'You requested a password reset. Click the button below to choose a new password. The link is valid for <b>10 minutes</b>.',
          url: buildResetUrl(resetToken),
          buttonText: 'Reset Password',
          footer: 'If you did not request this, ignore this email - your password remains unchanged.',
        }),
      });
    }

    // Identical response whether or not the account exists.
    res.status(200).json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error(`Forgot Password Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to process password reset request' });
  }
});

// @desc    Reset password with the emailed token
// @route   POST /api/auth/reset-password/:token
// @access  Public, rate limited
router.post('/reset-password/:token', authLimiter, async (req, res) => {
  const { password } = req.body;

  if (!isStrongEnough(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and contain letters and numbers',
    });
  }

  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // pre-save hook sets passwordChangedAt -> every existing session is invalidated.
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(`Reset Password Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to reset password' });
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Get current user details & profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let workerProfile = null;

    if (user.role === 'worker') {
      workerProfile = await WorkerProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      workerProfile,
    });
  } catch (error) {
    console.error(`Me Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to load profile' });
  }
});

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(`Update Profile Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Unable to update profile' });
  }
});

export default router;
