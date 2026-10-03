import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Please add a ticket title'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please specify a category'],
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      trim: true,
    },
    severity: {
      type: String,
      required: [true, 'Please specify severity'],
      enum: ['Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: [
        'OPEN',
        'Pending',
        'ACCEPTED',
        'Assigned',
        'WORKER_ON_THE_WAY',
        'ARRIVED',
        'IN_PROGRESS',
        'Completed',
        'Cancelled',
        'EXPIRED',
      ],
      default: 'OPEN',
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    jobOtp: {
      code: {
        type: String,
        trim: true,
        default: null,
        select: false, // Never returned in normal queries; only via explicit select
      },
      status: {
        type: String,
        enum: ['not_generated', 'pending', 'verified', 'expired'],
        default: 'not_generated',
      },
      createdAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
      },
    },
    preferredDay: {
      type: String,
      trim: true,
      default: null,
    },
    preferredTime: {
      type: String,
      trim: true,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    location: {
      address: {
        type: String,
        required: [true, 'Please provide an address'],
      },
      pincode: {
        type: String,
        required: [true, 'Please provide a pincode'],
        trim: true,
      },
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    resolutionImage: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ workerId: 1, status: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ status: 1, category: 1, 'location.pincode': 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
