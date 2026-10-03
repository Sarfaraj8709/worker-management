import express from 'express';
import WorkerProfile from '../models/WorkerProfile.js';
import Ticket from '../models/Ticket.js';
import AdminNotification from '../models/AdminNotification.js';
import { protect, authorize } from '../middleware/auth.js';
import upload, { uploadDoc } from '../middleware/upload.js';
import { createSystemMessage } from '../socket/socketServer.js';

const router = express.Router();

// Middleware to ensure user is a worker
const isWorkerUser = [protect, authorize('worker')];

// OTP attempts allowed before the Job Start OTP is locked
const OTP_MAX_ATTEMPTS = 5;

const VERIFICATION_DOC_TYPES = ['phone', 'email', 'identity', 'address', 'drivingLicense', 'certificates', 'profilePhoto'];
const VERIFICATION_DOC_LABELS = {
  phone: 'Phone', email: 'Email', identity: 'Identity', address: 'Address',
  drivingLicense: 'Driving License', certificates: 'Certificates', profilePhoto: 'Profile Photo',
};

const getDocStatus = (profile, docType) => {
  const v = profile.verification || {};
  const doc = v[docType];
  if (doc && doc.status) return doc.status;
  const found = (v.documents || []).find((d) => d.type === docType || d.label?.toLowerCase().includes(docType.replace(/([A-Z])/g, ' $1').trim()));
  return found ? found.status : 'not_submitted';
};

const computeProgress = (profile) => {
  const v = profile.verification || {};
  const required = v.requiredItems || VERIFICATION_DOC_TYPES;
  const statuses = required.map((type) => getDocStatus(profile, type));
  const verified = statuses.filter((s) => s === 'verified').length;
  return { total: required.length, verified, pct: required.length ? Math.round((verified / required.length) * 100) : 0 };
};

const buildVerificationResponse = (profile) => {
  const v = profile.verification || {};
  const docs = VERIFICATION_DOC_TYPES.map((type) => ({
    type,
    label: VERIFICATION_DOC_LABELS[type],
    status: getDocStatus(profile, type),
    required: v.requiredItems ? v.requiredItems.includes(type) : true,
    detail: {
      status: getDocStatus(profile, type),
      verifiedAt: v[type]?.verifiedAt || null,
      submittedAt: v[type]?.submittedAt || null,
      rejectionReason: v[type]?.rejectionReason || '',
      note: v[type]?.note || '',
      fileUrl: v[type]?.fileUrl || '',
      originalName: v[type]?.originalName || '',
      mimeType: v[type]?.mimeType || '',
      size: v[type]?.size || 0,
    },
  }));
  return {
    status: v.status || 'Pending',
    submittedAt: v.submittedAt || profile.createdAt,
    reviewedAt: v.reviewedAt || null,
    rejectionReason: v.rejectionReason || '',
    infoRequest: v.infoRequest || '',
    progress: computeProgress(profile),
    documents: docs,
    timeline: v.timeline || [],
  };
};

// @desc    Get assigned jobs for logged-in worker
// @route   GET /api/worker/jobs
// @access  Private (Worker only)
router.get('/jobs', isWorkerUser, async (req, res) => {
  try {
    const jobs = await Ticket.find({ workerId: req.user.id })
      .populate('userId', 'name phone email address')
      .sort({ createdAt: -1 });

    // Fetch worker stats too
    const profile = await WorkerProfile.findOne({ userId: req.user.id });

    // Calculate total earnings
    // Assuming each completed job has a flat rate or we can calculate based on completed job count
    const completedCount = jobs.filter((job) => job.status === 'Completed').length;
    const estimatedEarnings = completedCount * 500; // Flat 500 per job mock calculation

    res.status(200).json({
      success: true,
      stats: {
        rating: profile ? profile.rating : 5.0,
        isAvailable: profile ? profile.isAvailable : true,
        jobsCompleted: profile ? profile.jobsCompleted : 0,
        estimatedEarnings,
      },
      jobs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Toggle available/busy state
// @route   PATCH /api/worker/availability
// @access  Private (Worker only)
router.patch('/availability', isWorkerUser, async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    profile.isAvailable = !profile.isAvailable;
    await profile.save();

    res.status(200).json({
      success: true,
      isAvailable: profile.isAvailable,
      message: `Availability updated to ${profile.isAvailable ? 'Available' : 'Busy'}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Accept assigned job (Assigned -> ACCEPTED)
// @route   POST /api/worker/jobs/:id/accept
// @access  Private (Worker only)
router.post('/jobs/:id/accept', isWorkerUser, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.workerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This ticket is not assigned to you' });
    }

    if (ticket.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'You already accepted this job. A valid Job Start OTP from the customer is required to begin work.',
      });
    }

    if (ticket.status !== 'Assigned') {
      return res.status(400).json({ success: false, message: `Cannot accept ticket with status: ${ticket.status}` });
    }

    ticket.status = 'ACCEPTED';
    ticket.acceptedAt = new Date();
    await ticket.save();

    createSystemMessage({
      ticketId: ticket._id,
      message: `${req.user.name} accepted this job.`,
    });

    res.status(200).json({
      success: true,
      message: 'Job accepted. The customer must now share a Job Start OTP before you can begin.',
      ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Start assigned job after verifying customer's OTP (ACCEPTED -> IN_PROGRESS)
// @route   POST /api/worker/jobs/:id/start
// @access  Private (Worker only)
router.post('/jobs/:id/start', isWorkerUser, async (req, res) => {
  const { otp } = req.body;

  if (!otp || !/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({ success: false, message: 'Please enter the 6-digit OTP shared by the customer' });
  }

  try {
    const ticket = await Ticket.findById(req.params.id).select('+jobOtp.code');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.workerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This ticket is not assigned to you' });
    }

    if (!['Assigned', 'ACCEPTED', 'WORKER_ON_THE_WAY', 'ARRIVED'].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: `Work can only start from an accepted job (current status: ${ticket.status})`,
      });
    }

    const otpState = ticket.jobOtp || {};
    const now = Date.now();
    const otpExpired = otpState.status === 'pending' && otpState.expiresAt && new Date(otpState.expiresAt).getTime() <= now;

    if (otpState.status === 'not_generated' || !otpState.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP has been generated yet. Ask the customer to generate a Job Start OTP.',
      });
    }

    if (otpState.status === 'verified') {
      return res.status(400).json({ success: false, message: 'This OTP was already used to start the job' });
    }

    if (otpState.status === 'expired' || otpExpired) {
      return res.status(400).json({
        success: false,
        message: 'The OTP has expired. Ask the customer to generate a new one.',
      });
    }

    if (String(otp) !== otpState.code) {
      otpState.attempts = (otpState.attempts || 0) + 1;
      const attemptsRemaining = OTP_MAX_ATTEMPTS - otpState.attempts;

      if (otpState.attempts >= OTP_MAX_ATTEMPTS) {
        otpState.status = 'expired';
        otpState.code = null;
        await ticket.save();
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. The OTP has been locked - ask the customer to generate a new one.',
          attemptsRemaining: 0,
          otpLocked: true,
        });
      }

      await ticket.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining,
      });
    }

    ticket.status = 'IN_PROGRESS';
    ticket.startedAt = new Date();
    ticket.jobOtp = {
      ...otpState,
      status: 'verified',
      verifiedAt: new Date(),
    };

    await ticket.save();

    createSystemMessage({
      ticketId: ticket._id,
      message: `${req.user.name} started the job.`,
    });

    res.status(200).json({
      success: true,
      message: 'OTP verified. Job started successfully.',
      ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Reject assigned job (resets to Pending, removes workerId)
// @route   POST /api/worker/jobs/:id/reject
// @access  Private (Worker only)
router.post('/jobs/:id/reject', isWorkerUser, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.workerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This ticket is not assigned to you' });
    }

    if (!['Assigned', 'ACCEPTED'].includes(ticket.status)) {
      return res.status(400).json({ success: false, message: 'Can only reject jobs before starting work' });
    }

    // Reset ticket to open queue
    ticket.workerId = null;
    ticket.status = 'OPEN';
    await ticket.save();

    createSystemMessage({
      ticketId: ticket._id,
      message: `${req.user.name} declined this assignment.`,
    });

    res.status(200).json({
      success: true,
      message: 'Job rejected and returned to Pending pool',
      ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update worker profile (skills, serviceArea)
// @route   PUT /api/worker/profile
// @access  Private (Worker only)
router.put('/profile', isWorkerUser, async (req, res) => {
  const { skills, serviceArea } = req.body;

  try {
    let profile = await WorkerProfile.findOne({ userId: req.user.id });

    if (!profile) {
      // Create if it doesn't exist (safety fallback)
      profile = new WorkerProfile({ userId: req.user.id });
    }

    if (skills) profile.skills = Array.isArray(skills) ? skills : [skills];
    if (serviceArea) profile.serviceArea = serviceArea;

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Worker profile updated successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Resolve/Complete ticket with notes and photo
// @route   POST /api/worker/jobs/:id/resolve
// @access  Private (Worker only)
router.post('/jobs/:id/resolve', isWorkerUser, upload.single('resolutionImage'), async (req, res) => {
  const { notes } = req.body;

  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.workerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This ticket is not assigned to you' });
    }

    ticket.status = 'Completed';
    ticket.resolvedAt = new Date();
    if (notes) ticket.resolutionNotes = notes;

    if (req.file) {
      ticket.resolutionImage = `/uploads/${req.file.filename}`;
    }

    await ticket.save();

    // Increment completed jobs count on profile
    await WorkerProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { jobsCompleted: 1 } }
    );

    createSystemMessage({
      ticketId: ticket._id,
      message: `${req.user.name} marked this job as completed.`,
    });

    res.status(200).json({
      success: true,
      message: 'Job completed successfully',
      ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get worker's own verification status
// @route   GET /api/worker/verification
// @access  Private (Worker only)
router.get('/verification', isWorkerUser, async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }
    res.status(200).json({
      success: true,
      verification: buildVerificationResponse(profile),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Upload a verification document for a specific document type
// @route   POST /api/worker/verification/documents/:docType
// @access  Private (Worker only)
router.post('/verification/documents/:docType', isWorkerUser, uploadDoc.single('file'), async (req, res) => {
  const { docType } = req.params;
  try {
    if (!VERIFICATION_DOC_TYPES.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a document file' });
    }
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    profile.verification = profile.verification || {};
    const label = VERIFICATION_DOC_LABELS[docType];
    const fileUrl = `/uploads/${req.file.filename}`;

    // Update the per-type record
    const previous = profile.verification[docType] || {};
    profile.verification[docType] = {
      ...previous,
      status: 'pending',
      hasFile: true,
      submittedAt: new Date(),
      verifiedAt: null,
      rejectionReason: '',
      fileUrl,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    // Update the documents array entry (create if missing)
    const existing = (profile.verification.documents || []).find((d) => d.type === docType);
    if (existing) {
      existing.label = label;
      existing.status = 'pending';
      existing.hasFile = true;
      existing.submittedAt = new Date();
      existing.verifiedAt = null;
      existing.rejectionReason = '';
      existing.fileUrl = fileUrl;
      existing.originalName = req.file.originalname;
      existing.mimeType = req.file.mimetype;
      existing.size = req.file.size;
    } else {
      profile.verification.documents = [
        ...(profile.verification.documents || []),
        {
          label,
          type: docType,
          status: 'pending',
          hasFile: true,
          submittedAt: new Date(),
          verifiedAt: null,
          rejectionReason: '',
          fileUrl,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      ];
    }

    // Move application back into the review queue
    profile.verification.status = 'Under Review';
    profile.verification.reviewedAt = null;
    profile.verification.rejectionReason = '';
    profile.verification.infoRequest = '';
    profile.verification.timeline = [
      ...(profile.verification.timeline || []),
      { event: `${label} uploaded`, at: new Date(), note: `${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)` },
    ];

    await profile.save();

    await AdminNotification.create({
      type: 'verify',
      title: 'Verification document uploaded',
      body: `${req.user.name || 'Worker'} submitted a new ${label} document for review.`,
    });

    res.status(200).json({ success: true, verification: buildVerificationResponse(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Remove a worker's own uploaded verification document
// @route   DELETE /api/worker/verification/documents/:docType
// @access  Private (Worker only)
router.delete('/verification/documents/:docType', isWorkerUser, async (req, res) => {
  const { docType } = req.params;
  try {
    if (!VERIFICATION_DOC_TYPES.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    profile.verification = profile.verification || {};
    const label = VERIFICATION_DOC_LABELS[docType];
    if (profile.verification[docType]) {
      profile.verification[docType] = {
        ...profile.verification[docType],
        status: 'not_submitted',
        hasFile: false,
        verifiedAt: null,
        rejectionReason: '',
        fileUrl: '',
        originalName: '',
        mimeType: '',
        size: 0,
      };
    }
    profile.verification.documents = (profile.verification.documents || []).map((d) =>
      d.type === docType ? { ...d, status: 'not_submitted', hasFile: false, verifiedAt: null, rejectionReason: '', fileUrl: '', originalName: '', mimeType: '', size: 0 } : d
    );
    profile.verification.timeline = [
      ...(profile.verification.timeline || []),
      { event: `${label} removed`, at: new Date(), note: 'Worker removed the uploaded document' },
    ];

    await profile.save();

    res.status(200).json({ success: true, verification: buildVerificationResponse(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Submit/update worker verification documents
// @route   POST /api/worker/verification
// @access  Private (Worker only)
router.post('/verification', isWorkerUser, async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }
    const { documents } = req.body;
    profile.verification = profile.verification || {};
    profile.verification.submittedAt = new Date();
    if (!profile.verification.status || profile.verification.status === 'Pending') {
      profile.verification.status = 'Under Review';
    }
    if (Array.isArray(documents)) {
      documents.forEach((doc) => {
        if (VERIFICATION_DOC_TYPES.includes(doc.type)) {
          profile.verification[doc.type] = {
            ...profile.verification[doc.type],
            status: doc.status || 'pending',
            submittedAt: new Date(),
            documentId: doc.documentId || profile.verification[doc.type]?.documentId || '',
          };
          const existing = (profile.verification.documents || []).find((d) => d.type === doc.type);
          if (existing) {
            existing.status = doc.status || 'pending';
            existing.hasFile = true;
            existing.submittedAt = new Date();
          } else {
            profile.verification.documents = [
              ...(profile.verification.documents || []),
              { label: VERIFICATION_DOC_LABELS[doc.type], type: doc.type, status: doc.status || 'pending', hasFile: true, submittedAt: new Date() },
            ];
          }
        }
      });
    }
    profile.verification.timeline = [
      ...(profile.verification.timeline || []),
      { event: 'Documents Updated', at: new Date(), note: 'Worker updated verification documents' },
    ];
    await profile.save();
    res.status(200).json({ success: true, verification: { ...profile.verification, documents: profile.verification.documents || [] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
