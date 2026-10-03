import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    general: {
      platformName: { type: String, default: 'FixMate' },
      supportEmail: { type: String, default: 'support@fixmate.in' },
      supportPhone: { type: String, default: '' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      currency: { type: String, default: 'INR' },
    },
    jobs: {
      autoAssignment: { type: Boolean, default: true },
      maxAssignmentRadius: { type: Number, default: 10 },
      jobCancellationTime: { type: Number, default: 60 },
      emergencyMode: { type: Boolean, default: true },
    },
    workers: {
      requireVerification: { type: Boolean, default: true },
      minimumRating: { type: Number, default: 3.5 },
      maximumActiveJobs: { type: Number, default: 5 },
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
    security: {
      sessionManagement: { type: Boolean, default: true },
      loginAttempts: { type: Number, default: 5 },
      passwordPolicy: { type: String, default: 'strong' },
    },
    emergencyServices: {
      type: [String],
      default: ['Plumbing', 'Electrical', 'AC Repair'],
    },
  },
  { timestamps: true }
);

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
export default PlatformSettings;
