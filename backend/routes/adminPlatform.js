import express from 'express';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import WorkerProfile from '../models/WorkerProfile.js';
import Service from '../models/Service.js';
import Review from '../models/Review.js';
import AuditLog from '../models/AuditLog.js';
import AdminNotification from '../models/AdminNotification.js';
import Complaint from '../models/Complaint.js';
import Coupon from '../models/Coupon.js';
import ServicePackage from '../models/ServicePackage.js';
import Payment from '../models/Payment.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { protect, authorize } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';

const router = express.Router();
const isAdminUser = [protect, authorize('admin', 'organization_admin')];

const ACTIVE_JOB_STATUSES = ['OPEN', 'Pending', 'ACCEPTED', 'Assigned', 'WORKER_ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

const getSettingsDoc = async () => {
  let doc = await PlatformSettings.findOne({ key: 'default' });
  if (!doc) doc = await PlatformSettings.create({ key: 'default' });
  return doc;
};

const sanitizeUser = (user) => {
  if (!user) return user;
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

const VERIFICATION_DOC_TYPES = ['phone', 'email', 'identity', 'address', 'drivingLicense', 'certificates', 'profilePhoto'];
const VERIFICATION_DOC_LABELS = {
  phone: 'Phone',
  email: 'Email',
  identity: 'Identity',
  address: 'Address',
  drivingLicense: 'Driving License',
  certificates: 'Certificates',
  profilePhoto: 'Profile Photo',
};

const getDocStatus = (profile, docType) => {
  const v = profile.verification || {};
  const doc = v[docType];
  if (doc && doc.status) return doc.status;
  const found = (v.documents || []).find((d) => d.type === docType || d.label?.toLowerCase().includes(docType.replace(/([A-Z])/g, ' $1').trim()));
  return found ? found.status : 'not_submitted';
};

const getDocDetail = (profile, docType) => {
  const v = profile.verification || {};
  if (v[docType]) return v[docType];
  const found = (v.documents || []).find((d) => d.type === docType || d.label?.toLowerCase().includes(docType.replace(/([A-Z])/g, ' $1').trim()));
  return found || { status: 'not_submitted' };
};

const computeOverallStatus = (profile) => {
  const v = profile.verification || {};
  const required = v.requiredItems || VERIFICATION_DOC_TYPES;
  const docStatuses = required.map((type) => getDocStatus(profile, type));
  const hasRejected = docStatuses.includes('rejected');
  const hasExpired = docStatuses.includes('expired');
  const allVerified = docStatuses.every((s) => s === 'verified');
  const noneSubmitted = docStatuses.every((s) => s === 'not_submitted');
  const anyPending = docStatuses.some((s) => s === 'pending');
  const anyNotSubmitted = docStatuses.some((s) => s === 'not_submitted');

  if (hasRejected || hasExpired) return 'Verification Rejected';
  if (noneSubmitted) return 'Not Verified';
  if (allVerified) return 'Fully Verified';
  if (anyPending || anyNotSubmitted) return 'Partially Verified';
  return 'Pending Review';
};

const computeProgress = (profile) => {
  const v = profile.verification || {};
  const required = v.requiredItems || VERIFICATION_DOC_TYPES;
  const docStatuses = required.map((type) => getDocStatus(profile, type));
  const verifiedCount = docStatuses.filter((s) => s === 'verified').length;
  return { total: required.length, verified: verifiedCount, pct: required.length ? Math.round((verifiedCount / required.length) * 100) : 0 };
};

const syncLegacyFields = (profile) => {
  const v = profile.verification || {};
  v.phoneVerified = getDocStatus(profile, 'phone') === 'verified';
  v.emailVerified = getDocStatus(profile, 'email') === 'verified';
  v.identitySubmitted = getDocStatus(profile, 'identity') !== 'not_submitted';
  v.identityVerified = getDocStatus(profile, 'identity') === 'verified';
};

const addTimelineEvent = (profile, event, note) => {
  profile.verification = profile.verification || {};
  profile.verification.timeline = [
    ...(profile.verification.timeline || []),
    { event, at: new Date(), note: note || '' },
  ];
};

const mapVerification = async (profile) => {
  const v = profile.verification || {};
  syncLegacyFields(profile);
  await profile.save();
  const overall = computeOverallStatus(profile);
  const progress = computeProgress(profile);
  const documentsDetail = VERIFICATION_DOC_TYPES.reduce((acc, type) => {
    acc[type] = getDocDetail(profile, type);
    return acc;
  }, {});
  const documents = VERIFICATION_DOC_TYPES.map((type) => {
    const d = documentsDetail[type] || {};
    return {
      label: VERIFICATION_DOC_LABELS[type] || type,
      type,
      status: d.status || 'not_submitted',
      hasFile: !!d.hasFile || !!d.fileUrl,
      submittedAt: d.submittedAt || null,
      verifiedAt: d.verifiedAt || null,
      rejectionReason: d.rejectionReason || '',
      note: d.note || '',
      fileUrl: d.fileUrl || '',
      originalName: d.originalName || '',
      mimeType: d.mimeType || '',
      size: d.size || 0,
      documentId: d.documentId || '',
    };
  });
  return {
    _id: profile._id,
    userId: profile.userId,
    status: v.status || 'Pending',
    overallStatus: overall,
    progress,
    risk: v.risk || 'Low',
    submittedAt: v.submittedAt || profile.createdAt,
    reviewedAt: v.reviewedAt || null,
    rejectionReason: v.rejectionReason || '',
    infoRequest: v.infoRequest || '',
    documents,
    documentsDetail,
    timeline: v.timeline || [],
    verification: v,
    createdAt: profile.createdAt,
  };
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
router.get('/users', isAdminUser, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    const userIds = users.map((u) => u._id);
    const [jobCounts, profiles] = await Promise.all([
      Ticket.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      WorkerProfile.find({ userId: { $in: userIds } })
        .select('userId skills serviceArea rating jobsCompleted isAvailable suspended experience rate description verification.status createdAt')
        .lean(),
    ]);
    const countMap = Object.fromEntries(jobCounts.map((c) => [String(c._id), c.count]));
    const profileMap = Object.fromEntries(profiles.map((p) => [String(p.userId), p]));
    res.status(200).json({
      success: true,
      users: users.map((u) => ({
        ...u,
        jobs: countMap[String(u._id)] || 0,
        status: u.status || (u.isActive === false ? 'inactive' : 'active'),
        ...(profileMap[String(u._id)] ? { workerProfile: profileMap[String(u._id)] } : {}),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/:id', isAdminUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const jobs = await Ticket.find({ $or: [{ userId: user._id }, { workerId: user._id }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const payments = await Payment.find({ $or: [{ customerId: user._id }, { workerId: user._id }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const complaints = await Complaint.find({ $or: [{ customerId: user._id }, { workerId: user._id }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const workerProfile = await WorkerProfile.findOne({ userId: user._id }).lean();
    res.status(200).json({
      success: true,
      user: { ...sanitizeUser(user), jobs, payments, complaints, jobsCount: jobs.length, workerProfile },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id', isAdminUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { name, email, phone, role, status, isActive } = req.body;
    const prevStatus = user.status;
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) {
      user.status = status;
      user.isActive = status === 'active';
    }
    if (isActive !== undefined) {
      user.isActive = !!isActive;
      user.status = user.isActive ? 'active' : 'inactive';
    }
    await user.save();
    await writeAudit(req, {
      action: 'Updated user',
      entity: user.name,
      entityType: 'User',
      previousValue: prevStatus,
      newValue: user.status,
    });
    res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', isAdminUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin' || user.role === 'organization_admin') {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be deleted from this screen' });
    }
    await Ticket.updateMany(
      { workerId: user._id, status: { $in: ['Assigned', 'In Progress', 'ACCEPTED', 'WORKER_ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'] } },
      { $set: { workerId: null, status: 'Pending' } }
    );
    await WorkerProfile.deleteOne({ userId: user._id });
    await user.deleteOne();
    await writeAudit(req, { action: 'Deleted user', entity: user.name, entityType: 'User' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Jobs (tickets)
// ---------------------------------------------------------------------------
router.get('/jobs', isAdminUser, async (req, res) => {
  try {
    const jobs = await Ticket.find()
      .populate('userId', 'name email phone')
      .populate('workerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/jobs/:id', isAdminUser, async (req, res) => {
  try {
    const job = await Ticket.findById(req.params.id)
      .populate('userId', 'name email phone address')
      .populate('workerId', 'name email phone');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const payment = await Payment.findOne({ ticketId: job._id }).sort({ createdAt: -1 }).lean();
    const complaint = await Complaint.findOne({ ticketId: job._id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, job: { ...job.toObject(), payment, complaint } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/tickets/:id/status', isAdminUser, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const prev = ticket.status;
    if (req.body.status) ticket.status = req.body.status;
    await ticket.save();
    await writeAudit(req, {
      action: 'Updated job status',
      entity: ticket.title,
      entityType: 'Job',
      previousValue: prev,
      newValue: ticket.status,
    });
    res.status(200).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Worker by id + verification
// ---------------------------------------------------------------------------
router.get('/workers/:id', isAdminUser, async (req, res) => {
  try {
    const profile = await WorkerProfile.findById(req.params.id).populate('userId', 'name email phone address createdAt');
    if (!profile) return res.status(404).json({ success: false, message: 'Worker not found' });
    const workerId = profile.userId?._id || profile.userId;
    const jobs = await Ticket.find({ workerId }).sort({ createdAt: -1 }).limit(20).lean();
    const reviews = await Review.find({ workerId }).sort({ createdAt: -1 }).limit(20).lean();
    const payments = await Payment.find({ workerId }).sort({ createdAt: -1 }).limit(20).lean();
    const earnings = payments.filter((p) => p.status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    const verificationData = await mapVerification(profile);
    res.status(200).json({ success: true, worker: { ...profile.toObject(), jobs, reviews, payments, earnings, verification: verificationData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/verifications', isAdminUser, async (req, res) => {
  try {
    const workers = await WorkerProfile.find().populate('userId', 'name email phone').sort({ updatedAt: -1 });
    const mapped = await Promise.all(workers.map(mapVerification));
    res.status(200).json({ success: true, verifications: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/verifications/:id', isAdminUser, async (req, res) => {
  try {
    const profile = await WorkerProfile.findById(req.params.id).populate('userId', 'name email phone');
    if (!profile) return res.status(404).json({ success: false, message: 'Verification not found' });
    res.status(200).json({ success: true, verification: await mapVerification(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verifications/:id/documents/:docType', isAdminUser, async (req, res) => {
  try {
    const { docType } = req.params;
    if (!VERIFICATION_DOC_TYPES.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    const profile = await WorkerProfile.findById(req.params.id).populate('userId', 'name');
    if (!profile) return res.status(404).json({ success: false, message: 'Worker not found' });
    const { status, rejectionReason, note } = req.body;
    if (!status || !['verified', 'pending', 'rejected', 'not_submitted', 'expired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    profile.verification = profile.verification || {};
    profile.verification[docType] = {
      ...profile.verification[docType],
      status,
      submittedAt: profile.verification[docType]?.submittedAt || new Date(),
      verifiedAt: status === 'verified' ? new Date() : (profile.verification[docType]?.verifiedAt || null),
      rejectionReason: rejectionReason || profile.verification[docType]?.rejectionReason || '',
      documentId: profile.verification[docType]?.documentId || '',
    };
    if (status === 'rejected' && rejectionReason) {
      profile.verification[docType].rejectionReason = rejectionReason;
    }
    if (note) {
      profile.verification[docType].note = note;
    }
    const existingDoc = (profile.verification.documents || []).find((d) => d.type === docType);
    if (existingDoc) {
      existingDoc.status = status;
      existingDoc.submittedAt = profile.verification[docType].submittedAt;
      existingDoc.verifiedAt = profile.verification[docType].verifiedAt;
      existingDoc.rejectionReason = profile.verification[docType].rejectionReason;
      existingDoc.note = profile.verification[docType].note;
    } else {
      profile.verification.documents = [
        ...(profile.verification.documents || []),
        {
          label: VERIFICATION_DOC_LABELS[docType] || docType,
          type: docType,
          status,
          hasFile: true,
          submittedAt: profile.verification[docType].submittedAt,
          verifiedAt: profile.verification[docType].verifiedAt,
          rejectionReason: profile.verification[docType].rejectionReason,
          note: profile.verification[docType].note,
        },
      ];
    }
    const eventLabel = `${VERIFICATION_DOC_LABELS[docType] || docType} ${status === 'verified' ? 'approved' : status === 'rejected' ? 'rejected' : status}`;
    addTimelineEvent(profile, eventLabel, rejectionReason || note || `Status changed to ${status}`);
    syncLegacyFields(profile);
    await profile.save();
    await writeAudit(req, { action: `Updated ${docType} verification`, entity: profile.userId?.name, entityType: 'Worker', newValue: status });
    res.status(200).json({ success: true, verification: await mapVerification(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verifications/:id/approve', isAdminUser, async (req, res) => {
  try {
    const profile = await WorkerProfile.findById(req.params.id).populate('userId', 'name');
    if (!profile) return res.status(404).json({ success: false, message: 'Worker not found' });
    profile.verification = profile.verification || {};
    profile.verification.status = 'Approved';
    profile.verification.reviewedAt = new Date();
    profile.verification.phone = { ...(profile.verification.phone || {}), status: 'verified', verifiedAt: new Date() };
    profile.verification.email = { ...(profile.verification.email || {}), status: 'verified', verifiedAt: new Date() };
    profile.verification.identity = { ...(profile.verification.identity || {}), status: 'verified', verifiedAt: new Date() };
    profile.verification.address = { ...(profile.verification.address || {}), status: 'verified', verifiedAt: new Date() };
    profile.verification.drivingLicense = { ...(profile.verification.drivingLicense || {}), status: 'verified', verifiedAt: new Date() };
    profile.verification.certificates = { ...(profile.verification.certificates || {}), status: 'verified', verifiedAt: new Date() };
    profile.verification.profilePhoto = { ...(profile.verification.profilePhoto || {}), status: 'verified', verifiedAt: new Date() };
    profile.verification.documents = (profile.verification.documents || []).map((d) => ({
      ...d,
      status: 'verified',
      verifiedAt: new Date(),
    }));
    addTimelineEvent(profile, 'Approved', 'Approved by admin');
    syncLegacyFields(profile);
    await profile.save();
    await writeAudit(req, { action: 'Approved worker', entity: profile.userId?.name, entityType: 'Worker', newValue: 'Approved' });
    await AdminNotification.create({
      type: 'verify',
      title: 'Worker verification approved',
      body: `${profile.userId?.name || 'Worker'} was approved.`,
    });
    res.status(200).json({ success: true, verification: await mapVerification(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verifications/:id/reject', isAdminUser, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    const profile = await WorkerProfile.findById(req.params.id).populate('userId', 'name');
    if (!profile) return res.status(404).json({ success: false, message: 'Worker not found' });
    profile.verification = profile.verification || {};
    profile.verification.status = 'Rejected';
    profile.verification.rejectionReason = reason;
    profile.verification.reviewedAt = new Date();
    addTimelineEvent(profile, 'Rejected', reason);
    syncLegacyFields(profile);
    await profile.save();
    await writeAudit(req, { action: 'Rejected worker', entity: profile.userId?.name, entityType: 'Worker', newValue: reason });
    res.status(200).json({ success: true, verification: await mapVerification(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verifications/:id/request-info', isAdminUser, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Please describe what is missing' });
    const profile = await WorkerProfile.findById(req.params.id).populate('userId', 'name');
    if (!profile) return res.status(404).json({ success: false, message: 'Worker not found' });
    profile.verification = profile.verification || {};
    profile.verification.status = 'Under Review';
    profile.verification.infoRequest = note;
    addTimelineEvent(profile, 'Requested more information', note);
    await profile.save();
    await writeAudit(req, { action: 'Requested verification documents', entity: profile.userId?.name, entityType: 'Worker' });
    res.status(200).json({ success: true, verification: await mapVerification(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
router.get('/reviews', isAdminUser, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'name email')
      .populate('workerId', 'name')
      .populate('ticketId', 'title category')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/reviews/:id', isAdminUser, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (req.body.status) review.status = req.body.status;
    await review.save();
    await writeAudit(req, { action: 'Moderated review', entity: String(review._id), entityType: 'Review', newValue: review.status });
    res.status(200).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/reviews/:id', isAdminUser, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const workerId = review.workerId;
    await review.deleteOne();
    if (Review.getAverageRating) await Review.getAverageRating(workerId);
    await writeAudit(req, { action: 'Deleted review', entity: String(req.params.id), entityType: 'Review' });
    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
router.get('/payments', isAdminUser, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('customerId', 'name email')
      .populate('workerId', 'name')
      .populate('ticketId', 'title category')
      .sort({ createdAt: -1 })
      .lean();
    const totals = payments.reduce(
      (acc, p) => {
        acc.total += p.amount || 0;
        if (p.status === 'Paid') acc.successful += p.amount || 0;
        if (p.status === 'Pending') acc.pending += p.amount || 0;
        if (p.status === 'Refunded') acc.refunded += p.amount || 0;
        return acc;
      },
      { total: 0, successful: 0, pending: 0, refunded: 0 }
    );
    res.status(200).json({ success: true, payments, totals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/payments/:id', isAdminUser, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('workerId', 'name email')
      .populate('ticketId', 'title category status location');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.status(200).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------
router.get('/complaints', isAdminUser, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('customerId', 'name email phone')
      .populate('workerId', 'name email')
      .populate('ticketId', 'title category status')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/complaints/:id', isAdminUser, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('workerId', 'name email phone')
      .populate('ticketId', 'title category status location description images');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    const payment = complaint.ticketId ? await Payment.findOne({ ticketId: complaint.ticketId._id }).lean() : null;
    res.status(200).json({ success: true, complaint: { ...complaint.toObject(), payment } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/complaints/:id', isAdminUser, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    const prev = complaint.status;
    const { status, assignedTo, note, action } = req.body;
    if (status) complaint.status = status;
    if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
    complaint.timeline = [
      ...(complaint.timeline || []),
      { event: action || status || 'Updated', at: new Date(), note: note || '' },
    ];
    await complaint.save();
    await writeAudit(req, {
      action: action || 'Updated complaint',
      entity: String(complaint._id),
      entityType: 'Complaint',
      previousValue: prev,
      newValue: complaint.status,
    });
    res.status(200).json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Coupons / packages
// ---------------------------------------------------------------------------
router.get('/coupons', isAdminUser, async (_req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/coupons', isAdminUser, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    await writeAudit(req, { action: 'Created coupon', entity: coupon.code, entityType: 'Coupon' });
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/coupons/:id', isAdminUser, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    await writeAudit(req, { action: 'Updated coupon', entity: coupon.code, entityType: 'Coupon' });
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/coupons/:id', isAdminUser, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    await coupon.deleteOne();
    await writeAudit(req, { action: 'Deleted coupon', entity: coupon.code, entityType: 'Coupon' });
    res.status(200).json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/packages', isAdminUser, async (_req, res) => {
  try {
    const packages = await ServicePackage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/packages', isAdminUser, async (req, res) => {
  try {
    const pkg = await ServicePackage.create(req.body);
    await writeAudit(req, { action: 'Created package', entity: pkg.name, entityType: 'Package' });
    res.status(201).json({ success: true, pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/packages/:id', isAdminUser, async (req, res) => {
  try {
    const pkg = await ServicePackage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    await writeAudit(req, { action: 'Updated package', entity: pkg.name, entityType: 'Package' });
    res.status(200).json({ success: true, pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/packages/:id', isAdminUser, async (req, res) => {
  try {
    const pkg = await ServicePackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    await pkg.deleteOne();
    await writeAudit(req, { action: 'Deleted package', entity: pkg.name, entityType: 'Package' });
    res.status(200).json({ success: true, message: 'Package deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Emergency
// ---------------------------------------------------------------------------
router.get('/emergency', isAdminUser, async (_req, res) => {
  try {
    const settings = await getSettingsDoc();
    const requests = await Ticket.find({ severity: 'Emergency', status: { $nin: ['Completed', 'Cancelled', 'EXPIRED'] } })
      .populate('userId', 'name phone')
      .populate('workerId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({
      success: true,
      requests: requests.map((t) => ({
        _id: t._id,
        title: t.title,
        category: t.category,
        status: t.status,
        distance: t.location?.pincode ? `Pincode ${t.location.pincode}` : '—',
        createdAt: t.createdAt,
        worker: t.workerId?.name,
      })),
      config: { services: settings.emergencyServices || [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/emergency/config', isAdminUser, async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    if (Array.isArray(req.body.services)) settings.emergencyServices = req.body.services;
    await settings.save();
    await writeAudit(req, { action: 'Updated emergency services', entity: 'Emergency', entityType: 'Settings' });
    res.status(200).json({ success: true, config: { services: settings.emergencyServices } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Analytics / reports
// ---------------------------------------------------------------------------
router.get('/analytics', isAdminUser, async (req, res) => {
  try {
    const now = new Date();
    const days = Number(req.query.days) || 30;
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      newUsers,
      totalUsers,
      customers,
      workers,
      newWorkers,
      verifiedWorkers,
      activeWorkers,
      tickets,
      completed,
      cancelled,
      payments,
      categoryAgg,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      User.countDocuments(),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'worker' }),
      User.countDocuments({ role: 'worker', createdAt: { $gte: since } }),
      WorkerProfile.countDocuments({ 'verification.status': 'Approved' }),
      WorkerProfile.countDocuments({ isAvailable: true, suspended: { $ne: true } }),
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'Completed' }),
      Ticket.countDocuments({ status: 'Cancelled' }),
      Payment.find().lean(),
      Ticket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);

    const paid = payments.filter((p) => p.status === 'Paid');
    const gross = paid.reduce((s, p) => s + (p.amount || 0), 0);
    const refunds = payments.filter((p) => p.status === 'Refunded').reduce((s, p) => s + (p.amount || 0), 0);
    const commissionRate = 0.184;
    const commission = Math.round(gross * commissionRate);
    const payouts = gross - commission;
    const net = gross - refunds - payouts;

    const ratingStats = await WorkerProfile.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]);
    const totalCat = categoryAgg.reduce((s, c) => s + c.count, 0) || 1;

    const buckets = [];
    const bucketCount = days <= 7 ? days : days <= 30 ? 10 : days <= 90 ? 12 : 12;
    const bucketMs = (days * 24 * 60 * 60 * 1000) / bucketCount;
    for (let i = 0; i < bucketCount; i += 1) {
      const start = new Date(since.getTime() + i * bucketMs);
      const end = new Date(start.getTime() + bucketMs);
      const value = paid
        .filter((p) => new Date(p.createdAt) >= start && new Date(p.createdAt) < end)
        .reduce((s, p) => s + (p.amount || 0), 0);
      buckets.push({
        label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value,
      });
    }

    const busyWorkers = await Ticket.distinct('workerId', { status: { $in: ACTIVE_JOB_STATUSES }, workerId: { $ne: null } });

    res.status(200).json({
      success: true,
      analytics: {
        users: {
          new: newUsers,
          active: totalUsers,
          retention: totalUsers ? Math.round((customers / totalUsers) * 100) : 0,
          customers,
          workers,
        },
        workers: {
          new: newWorkers,
          verified: verifiedWorkers,
          active: activeWorkers,
          utilization: workers ? Math.round((busyWorkers.length / workers) * 100) : 0,
          averageRating: ratingStats[0] ? Math.round(ratingStats[0].avg * 10) / 10 : 0,
        },
        jobs: {
          requests: tickets,
          new: await Ticket.countDocuments({ status: { $in: ['OPEN', 'Pending'] } }),
          completionRate: tickets ? Math.round((completed / tickets) * 100) : 0,
          cancellationRate: tickets ? Math.round((cancelled / tickets) * 1000) / 10 : 0,
          avgCompletionHours: 0,
        },
        revenue: {
          gross,
          net: Math.max(0, net),
          payouts,
          commission: commissionRate * 100,
          refunds,
          series: buckets,
        },
        services: categoryAgg.map((c) => ({
          name: c._id || 'Other',
          pct: Math.round((c.count / totalCat) * 100),
          count: c.count,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports', isAdminUser, async (_req, res) => {
  try {
    const [users, workers, jobs, payments, complaints, services] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'worker' }),
      Ticket.countDocuments(),
      Payment.countDocuments(),
      Complaint.countDocuments(),
      Service.countDocuments(),
    ]);
    res.status(200).json({
      success: true,
      reports: [
        { id: 'users', name: 'User Report', count: users },
        { id: 'workers', name: 'Worker Report', count: workers },
        { id: 'jobs', name: 'Job Report', count: jobs },
        { id: 'revenue', name: 'Revenue Report', count: payments },
        { id: 'payments', name: 'Payment Report', count: payments },
        { id: 'complaints', name: 'Complaint Report', count: complaints },
        { id: 'services', name: 'Service Report', count: services },
      ],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports/export', isAdminUser, async (req, res) => {
  try {
    const type = req.query.report || 'jobs';
    let rows = [];
    if (type === 'users') {
      const users = await User.find().select('-password').lean();
      rows = [['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'], ...users.map((u) => [u.name, u.email, u.phone, u.role, u.status || 'active', u.createdAt])];
    } else if (type === 'workers') {
      const workers = await WorkerProfile.find().populate('userId', 'name email phone').lean();
      rows = [['Name', 'Email', 'Skills', 'Rating', 'Jobs', 'Area'], ...workers.map((w) => [w.userId?.name, w.userId?.email, (w.skills || []).join('|'), w.rating, w.jobsCompleted, w.serviceArea])];
    } else if (type === 'payments' || type === 'revenue') {
      const payments = await Payment.find().populate('customerId', 'name').lean();
      rows = [['ID', 'Customer', 'Amount', 'Status', 'Method', 'Date'], ...payments.map((p) => [String(p._id), p.customerId?.name, p.amount, p.status, p.method, p.createdAt])];
    } else if (type === 'complaints') {
      const complaints = await Complaint.find().populate('customerId', 'name').lean();
      rows = [['ID', 'Customer', 'Category', 'Priority', 'Status', 'Date'], ...complaints.map((c) => [String(c._id), c.customerId?.name, c.category, c.priority, c.status, c.createdAt])];
    } else if (type === 'services') {
      const services = await Service.find().lean();
      rows = [['Name', 'Active', 'Price', 'Description'], ...services.map((s) => [s.name, s.isActive, s.price, s.description])];
    } else {
      const jobs = await Ticket.find().populate('userId', 'name').populate('workerId', 'name').lean();
      rows = [['ID', 'Title', 'Customer', 'Worker', 'Status', 'Category', 'Created'], ...jobs.map((j) => [String(j._id), j.title, j.userId?.name, j.workerId?.name, j.status, j.category, j.createdAt])];
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// Settings / notifications / audit / search / properties
// ---------------------------------------------------------------------------
router.get('/settings', isAdminUser, async (_req, res) => {
  try {
    const settings = await getSettingsDoc();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', isAdminUser, async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    const body = req.body || {};
    if (body.general) settings.general = { ...settings.general.toObject?.() || settings.general, ...body.general };
    if (body.jobs) settings.jobs = { ...settings.jobs.toObject?.() || settings.jobs, ...body.jobs };
    if (body.workers) settings.workers = { ...settings.workers.toObject?.() || settings.workers, ...body.workers };
    if (body.notifications) settings.notifications = { ...settings.notifications.toObject?.() || settings.notifications, ...body.notifications };
    if (body.security) settings.security = { ...settings.security.toObject?.() || settings.security, ...body.security };
    await settings.save();
    await writeAudit(req, { action: 'Updated settings', entity: 'Platform', entityType: 'Settings' });
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/notifications', isAdminUser, async (_req, res) => {
  try {
    const notifications = await AdminNotification.find().sort({ createdAt: -1 }).limit(50).lean();
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/notifications/read', isAdminUser, async (_req, res) => {
  try {
    await AdminNotification.updateMany({ read: false }, { $set: { read: true } });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/audit-logs', isAdminUser, async (_req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(200).lean();
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/search', isAdminUser, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(200).json({ users: [], workers: [], jobs: [], services: [], transactions: [], complaints: [] });
    }
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [users, workerProfiles, jobs, services, payments, complaints] = await Promise.all([
      User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] }).select('name email role').limit(5).lean(),
      WorkerProfile.find().populate({ path: 'userId', match: { name: rx }, select: 'name email' }).limit(20),
      Ticket.find({ $or: [{ title: rx }, { category: rx }] }).select('title category status').limit(5).lean(),
      Service.find({ name: rx }).select('name').limit(5).lean(),
      Payment.find().populate({ path: 'customerId', match: { name: rx }, select: 'name' }).limit(10),
      Complaint.find({ category: rx }).limit(5).lean(),
    ]);
    const workers = workerProfiles.filter((w) => w.userId).slice(0, 5);
    const transactions = payments.filter((p) => p.customerId).slice(0, 5);
    res.status(200).json({ users, workers, jobs, services, transactions, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/properties', isAdminUser, async (_req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('name email address').lean();
    const properties = users
      .filter((u) => u.address?.pincode)
      .map((u) => ({
        _id: u._id,
        propertyName: u.address?.street ? `${u.address.street}` : 'Primary address',
        propertyType: 'Home',
        address: [u.address?.street, u.address?.city, u.address?.state].filter(Boolean).join(', ') || '—',
        city: u.address?.city || '—',
        state: u.address?.state || '—',
        pincode: u.address?.pincode,
        customer: u.name,
      }));
    res.status(200).json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
