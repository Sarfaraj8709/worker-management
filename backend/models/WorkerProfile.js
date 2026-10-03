import mongoose from 'mongoose';

const workerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    skills: {
      type: [String],
      required: [true, 'Please specify at least one skill'],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'A worker must have at least one skill.',
      },
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    serviceArea: {
      type: String, // Can be a Pincode (e.g. "400001") or City name
      required: [true, 'Please specify service area pincode/city'],
      trim: true,
    },
    jobsCompleted: {
      type: Number,
      default: 0,
    },
    suspended: {
      type: Boolean,
      default: false,
    },
    experience: { type: String, trim: true, default: '' },
    rate: { type: Number, default: 0 },
    description: { type: String, trim: true, default: '' },
    availableDays: { type: [String], default: [] },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
    },
    emergencyService: { type: Boolean, default: false },
    maxJobsPerDay: { type: Number, default: 0 },
    verification: {
      status: {
        type: String,
        enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Expired'],
        default: 'Pending',
      },
      phoneVerified: { type: Boolean, default: false },
      emailVerified: { type: Boolean, default: false },
      identitySubmitted: { type: Boolean, default: false },
      identityVerified: { type: Boolean, default: false },
      risk: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
      rejectionReason: { type: String, trim: true, default: '' },
      infoRequest: { type: String, trim: true, default: '' },
      submittedAt: { type: Date, default: Date.now },
      reviewedAt: { type: Date, default: null },
      documents: {
        type: [
          {
            label: String,
            last4: String,
            status: { type: String, enum: ['pending', 'verified', 'rejected', 'not_submitted', 'expired'], default: 'pending' },
            hasFile: { type: Boolean, default: false },
            submittedAt: { type: Date, default: null },
            verifiedAt: { type: Date, default: null },
            rejectionReason: { type: String, trim: true, default: '' },
            note: { type: String, trim: true, default: '' },
            type: { type: String, trim: true, default: '' },
            fileUrl: { type: String, trim: true, default: '' },
            originalName: { type: String, trim: true, default: '' },
            mimeType: { type: String, trim: true, default: '' },
            size: { type: Number, default: 0 },
          },
        ],
        default: [],
      },
      timeline: {
        type: [{ event: String, at: Date, note: String }],
        default: [],
      },
      phone: {
        status: { type: String, enum: ['verified', 'pending', 'rejected', 'not_submitted', 'expired'], default: 'not_submitted' },
        verifiedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, default: '' },
        documentId: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
        originalName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
      },
      email: {
        status: { type: String, enum: ['verified', 'pending', 'rejected', 'not_submitted', 'expired'], default: 'not_submitted' },
        verifiedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, default: '' },
        documentId: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
        originalName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
      },
      identity: {
        status: { type: String, enum: ['verified', 'pending', 'rejected', 'not_submitted', 'expired'], default: 'not_submitted' },
        verifiedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, default: '' },
        documentId: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
        originalName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
      },
      address: {
        status: { type: String, enum: ['verified', 'pending', 'rejected', 'not_submitted', 'expired'], default: 'not_submitted' },
        verifiedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, default: '' },
        documentId: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
        originalName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
      },
      drivingLicense: {
        status: { type: String, enum: ['verified', 'pending', 'rejected', 'not_submitted', 'expired'], default: 'not_submitted' },
        verifiedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, default: '' },
        documentId: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
        originalName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
      },
      certificates: {
        status: { type: String, enum: ['verified', 'pending', 'rejected', 'not_submitted', 'expired'], default: 'not_submitted' },
        verifiedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, default: '' },
        documentId: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
        originalName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
      },
      profilePhoto: {
        status: { type: String, enum: ['verified', 'pending', 'rejected', 'not_submitted', 'expired'], default: 'not_submitted' },
        verifiedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, default: '' },
        documentId: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
        originalName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
      },
      requiredItems: {
        type: [String],
        default: ['phone', 'email', 'identity', 'address', 'drivingLicense', 'certificates', 'profilePhoto'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add index on userId for fast lookups
workerProfileSchema.index({ userId: 1 });
// Add compound index for matching service
workerProfileSchema.index({ isAvailable: 1, skills: 1, serviceArea: 1 });

const WorkerProfile = mongoose.model('WorkerProfile', workerProfileSchema);
export default WorkerProfile;
