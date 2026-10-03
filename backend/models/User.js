import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // Tokens issued before this date are rejected -> changing the
    // password invalidates every existing session.
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'worker', 'admin', 'organization_admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, required: true, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (cost 12)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  // If the password is being changed (not on first create), invalidate
  // all previously issued sessions.
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Constant-time-safe dummy compare target for unknown emails,
// so response timing doesn't reveal whether an account exists.
export const DUMMY_PASSWORD_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.5uWf2cQp1eXOaXG0uYR.7mJZlDkPe3S';

// Create a random email-verification token. Only its SHA-256 hash is
// persisted; a database leak therefore cannot yield usable tokens.
userSchema.methods.createEmailVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return rawToken;
};

// Create a random password-reset token (hashed in DB, 10 minute lifetime)
userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
  return rawToken;
};

const User = mongoose.model('User', userSchema);
export default User;
