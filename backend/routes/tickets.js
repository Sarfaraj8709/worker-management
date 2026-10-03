import express from 'express';
import crypto from 'crypto';
import Ticket from '../models/Ticket.js';
import Review from '../models/Review.js';
import WorkerProfile from '../models/WorkerProfile.js';
import Service from '../models/Service.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { createSystemMessage } from '../socket/socketServer.js';
const router = express.Router();

// OTP constants for the Job Start flow
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

const generateOtpCode = () => crypto.randomInt(100000, 1000000).toString();

// Active OTP phases where a worker is assigned but work has not started
const OTP_ELIGIBLE_STATUSES = ['Assigned', 'ACCEPTED', 'WORKER_ON_THE_WAY', 'ARRIVED'];

// @desc    Get user's tickets
// @route   GET /api/tickets/my-tickets
// @access  Private
router.get('/my-tickets', protect, authorize('user'), async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id })
      .populate('workerId', 'name phone email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get available service categories
// @route   GET /api/tickets/services
// @access  Public
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, count: services.length, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a new ticket and trigger auto-matching
// @route   POST /api/tickets/create
// @access  Private
router.post('/create', protect, authorize('user'), upload.single('image'), async (req, res) => {
  try {
    const { title, category, subCategory, description, severity, address, pincode, preferredDay, preferredTime } = req.body;

    if (!title || !category || !description || !address || !pincode) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    const images = [];
    if (req.file) {
      // Relative path that frontend can access
      images.push(`/uploads/${req.file.filename}`);
    }

    const ticket = await Ticket.create({
      userId: req.user.id,
      title,
      category,
      subCategory: subCategory || null,
      description,
      severity,
      preferredDay: preferredDay || null,
      preferredTime: preferredTime || null,
      images,
      location: {
        address,
        pincode,
      },
      status: 'OPEN',
      workerId: null,
    });

    res.status(201).json({
      success: true,
      message: 'Service request created successfully and is now waiting for an eligible worker to accept it.',
      ticket,
    });
  } catch (error) {
    console.error(`Create Ticket Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get single ticket details
// @route   GET /api/tickets/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate('workerId', 'name phone email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Authorization check: User must be ticket owner, assigned worker, or admin
    const isOwner = ticket.userId._id.toString() === req.user.id;
    const isAssignedWorker = ticket.workerId && ticket.workerId._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedWorker && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this ticket' });
    }

    // Fetch review if ticket is completed
    let review = null;
    if (ticket.status === 'Completed') {
      review = await Review.findOne({ ticketId: ticket._id });
    }

    res.status(200).json({
      success: true,
      ticket: {
        ...ticket.toObject(),
        jobOtp: ticket.jobOtp ? { ...ticket.jobOtp.toObject(), maxAttempts: OTP_MAX_ATTEMPTS } : ticket.jobOtp,
      },
      review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    View the current Job Start OTP (only the ticket owner)
// @route   GET /api/tickets/:id/otp
// @access  Private (User owner only)
router.get('/:id/otp', protect, authorize('user'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).select('+jobOtp.code');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this OTP' });
    }

    const otp = ticket.jobOtp || {};
    const now = Date.now();
    const expired = otp.status === 'pending' && otp.expiresAt && new Date(otp.expiresAt).getTime() <= now;

    if (expired) {
      otp.status = 'expired';
      otp.code = null;
      await ticket.save();
    }

    const isUsable = otp.status === 'pending' && otp.expiresAt && new Date(otp.expiresAt).getTime() > now;

    res.status(200).json({
      success: true,
      otp: {
        status: otp.status || 'not_generated',
        code: isUsable ? otp.code : null,
        createdAt: otp.createdAt || null,
        expiresAt: otp.expiresAt || null,
        verifiedAt: otp.verifiedAt || null,
        attempts: otp.attempts || 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Generate / regenerate the Job Start OTP (only the ticket owner)
// @route   POST /api/tickets/:id/otp
// @access  Private (User owner only)
router.post('/:id/otp', protect, authorize('user'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).select('+jobOtp.code');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to generate OTP for this ticket' });
    }

    if (!ticket.workerId) {
      return res.status(400).json({ success: false, message: 'No worker is assigned to this ticket yet' });
    }

    if (!OTP_ELIGIBLE_STATUSES.includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: `OTP can only be generated while a worker is assigned and before work starts (current status: ${ticket.status})`,
      });
    }

    const now = Date.now();
    ticket.jobOtp = {
      code: generateOtpCode(),
      status: 'pending',
      createdAt: new Date(now),
      expiresAt: new Date(now + OTP_TTL_MS),
      verifiedAt: null,
      attempts: 0,
    };

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Job Start OTP generated. Share this OTP with the assigned worker so they can begin work.',
      otp: {
        status: 'pending',
        code: ticket.jobOtp.code,
        createdAt: ticket.jobOtp.createdAt,
        expiresAt: ticket.jobOtp.expiresAt,
        verifiedAt: null,
        attempts: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update ticket status (User/Worker action)
// @route   PATCH /api/tickets/:id/status
// @access  Private
router.patch('/:id/status', protect, async (req, res) => {
  const { status } = req.body;

  if (!['OPEN', 'Pending', 'ACCEPTED', 'Assigned', 'WORKER_ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'Completed', 'Cancelled', 'EXPIRED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role checks
    const isUser = req.user.role === 'user' && ticket.userId.toString() === req.user.id;
    const isWorker = req.user.role === 'worker' && ticket.workerId && ticket.workerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isWorker && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this ticket' });
    }

    // Business Logic rules for state transitions:
    // Clients can cancel their ticket if it's not completed yet.
    if (status === 'Cancelled' && !isUser && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only clients or admins can cancel tickets' });
    }

    // Workers cannot mark a job IN_PROGRESS directly - they must verify the
    // Job Start OTP via POST /api/worker/jobs/:id/start first.
    if (status === 'IN_PROGRESS' && isWorker) {
      return res.status(403).json({
        success: false,
        message: 'A valid Job Start OTP is required to begin work. Use the "Start with OTP" flow instead.',
      });
    }

    ticket.status = status;

    if (status === 'Completed') {
      ticket.resolvedAt = new Date();
      // Increment jobs completed for worker
      if (ticket.workerId) {
        await WorkerProfile.findOneAndUpdate(
          { userId: ticket.workerId },
          { $inc: { jobsCompleted: 1 } }
        );
      }
    }

    await ticket.save();

    createSystemMessage({
      ticketId: ticket._id,
      message: `Ticket status changed to ${status}.`,
    });

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Submit worker review (Client action)
// @route   POST /api/tickets/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, authorize('user'), async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ success: false, message: 'Please provide rating and comment' });
  }

  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only ticket owner can review' });
    }

    if (ticket.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed jobs' });
    }

    if (!ticket.workerId) {
      return res.status(400).json({ success: false, message: 'No worker was assigned to this ticket' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ ticketId: ticket._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this ticket' });
    }

    const review = await Review.create({
      ticketId: ticket._id,
      userId: req.user.id,
      workerId: ticket.workerId,
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
