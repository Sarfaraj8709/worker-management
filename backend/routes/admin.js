import express from 'express';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import WorkerProfile from '../models/WorkerProfile.js';
import Service from '../models/Service.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const isAdminUser = [protect, authorize('admin', 'organization_admin')];

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

// @desc    Get dashboard metrics
// @route   GET /api/admin/metrics
// @access  Private (Admin only)
router.get('/metrics', isAdminUser, async (req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const pendingTickets = await Ticket.countDocuments({ status: { $in: ['Pending', 'OPEN'] } });
    const assignedTickets = await Ticket.countDocuments({ status: 'Assigned' });
    const inProgressTickets = await Ticket.countDocuments({ status: { $in: ['In Progress', 'IN_PROGRESS'] } });
    const completedTickets = await Ticket.countDocuments({ status: 'Completed' });
    const cancelledTickets = await Ticket.countDocuments({ status: 'Cancelled' });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const totalWorkers = await User.countDocuments({ role: 'worker' });
    const activeWorkers = await WorkerProfile.countDocuments({ isAvailable: true, suspended: { $ne: true } });
    const totalUsers = await User.countDocuments();
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const usersPrevMonth = await User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    const workersThisMonth = await User.countDocuments({ role: 'worker', createdAt: { $gte: thirtyDaysAgo } });
    const workersPrevMonth = await User.countDocuments({ role: 'worker', createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    const verificationPending = await WorkerProfile.countDocuments({
      $or: [{ 'verification.status': 'Pending' }, { 'verification.status': { $exists: false } }],
    });
    const verificationFullyVerified = await WorkerProfile.countDocuments({ 'verification.status': 'Approved' });
    const verificationRejected = await WorkerProfile.countDocuments({ 'verification.status': 'Rejected' });
    const verificationExpired = await WorkerProfile.countDocuments({ 'verification.status': 'Expired' });
    const totalWorkersForVerif = await WorkerProfile.countDocuments();
    const verificationPartially = totalWorkersForVerif - verificationFullyVerified - verificationPending - verificationRejected - verificationExpired;
    const activeJobs = await Ticket.countDocuments({
      status: { $in: ['OPEN', 'Pending', 'ACCEPTED', 'Assigned', 'WORKER_ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'] },
    });

    const Payment = (await import('../models/Payment.js')).default;
    const paid = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const paidThis = await Payment.aggregate([
      { $match: { status: 'Paid', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const paidPrev = await Payment.aggregate([
      { $match: { status: 'Paid', createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenueTotal = paid[0]?.total || 0;
    const revenueGrowth = paidPrev[0]?.total
      ? Math.round((((paidThis[0]?.total || 0) - paidPrev[0].total) / paidPrev[0].total) * 1000) / 10
      : paidThis[0]?.total
        ? 100
        : 0;
    const userGrowth = usersPrevMonth ? Math.round(((usersThisMonth - usersPrevMonth) / usersPrevMonth) * 1000) / 10 : usersThisMonth ? 100 : 0;
    const workerGrowth = workersPrevMonth ? Math.round(((workersThisMonth - workersPrevMonth) / workersPrevMonth) * 1000) / 10 : workersThisMonth ? 100 : 0;

    // Calculate worker efficiency (average ratings)
    const ratingStats = await WorkerProfile.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
        },
      },
    ]);
    const averageRating = ratingStats.length > 0 ? Math.round(ratingStats[0].avgRating * 10) / 10 : 5.0;

    res.status(200).json({
      success: true,
      metrics: {
        tickets: {
          total: activeJobs,
          all: totalTickets,
          pending: pendingTickets,
          assigned: assignedTickets,
          inProgress: inProgressTickets,
          completed: completedTickets,
          cancelled: cancelledTickets,
        },
        workers: {
          total: totalWorkers,
          active: activeWorkers,
          averageRating,
          growth: workerGrowth,
        },
        users: {
          total: totalUsers,
          growth: userGrowth,
        },
        revenue: {
          total: revenueTotal,
          growth: revenueGrowth,
        },
        verificationPending,
        verificationSummary: {
          total: totalWorkersForVerif,
          fullyVerified: verificationFullyVerified,
          partiallyVerified: Math.max(0, verificationPartially),
          pendingReview: verificationPending,
          rejected: verificationRejected,
          expired: verificationExpired,
        },
        systemHealth: {
          database: 'Connected',
          autoDispatchService: 'Running',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all unassigned tickets
// @route   GET /api/admin/unassigned
// @access  Private (Admin only)
router.get('/unassigned', isAdminUser, async (req, res) => {
  try {
    const unassignedTickets = await Ticket.find({ status: 'Pending', workerId: null })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: unassignedTickets.length,
      tickets: unassignedTickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all workers with profiles (for manual assignment selection)
// @route   GET /api/admin/workers
// @access  Private (Admin only)
router.get('/workers', isAdminUser, async (req, res) => {
  try {
    const workers = await WorkerProfile.find()
      .populate('userId', 'name email phone address')
      .sort({ rating: -1 });

    const mapped = workers.map((w) => {
      const overall = computeOverallStatus(w);
      const progress = computeProgress(w);
      return {
        ...w.toObject(),
        verification: {
          ...w.verification,
          overallStatus: overall,
          progress,
        },
      };
    });

    res.status(200).json({
      success: true,
      count: mapped.length,
      workers: mapped,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const generateRandomPassword = () => {
  return Math.random().toString(36).slice(-10) + 'A1!';
};

// @desc    Create a new worker account and profile
// @route   POST /api/admin/workers
// @access  Private (Admin only)
router.post('/workers', isAdminUser, async (req, res) => {
  const { name, email, phone, password, skills, serviceArea, rating, isAvailable, jobsCompleted, address } = req.body;

  if (!name || !email || !phone || !skills || !serviceArea) {
    return res.status(400).json({ success: false, message: 'name, email, phone, skills, and serviceArea are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }

    const user = new User({
      name,
      email,
      phone,
      role: 'worker',
      password: password || generateRandomPassword(),
      address: {
        pincode: address?.pincode || serviceArea,
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
      },
    });

    await user.save();

    const profile = new WorkerProfile({
      userId: user._id,
      skills: Array.isArray(skills) ? skills : skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      serviceArea,
      rating: rating !== undefined ? rating : 5.0,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      jobsCompleted: jobsCompleted || 0,
      experience: req.body.experience || '',
      rate: req.body.rate || 0,
      description: req.body.description || '',
      availableDays: req.body.availableDays || [],
      workingHours: {
        start: req.body.startHour || '09:00',
        end: req.body.endHour || '18:00',
      },
      emergencyService: !!req.body.emergencyService,
      maxJobsPerDay: req.body.maxJobsPerDay || 0,
      verification: {
        status: 'Pending',
        phoneVerified: true,
        emailVerified: true,
        identitySubmitted: true,
        submittedAt: new Date(),
        documents: [
          { label: 'Identity Document', status: 'pending', hasFile: true },
          { label: 'Address Proof', status: 'pending', hasFile: true },
          { label: 'Driving License', status: 'pending', hasFile: !!req.body.drivingLicense },
          { label: 'Certificates', status: 'pending', hasFile: !!req.body.certificates },
          { label: 'Profile Photo', status: 'pending', hasFile: !!req.body.profilePhoto },
        ],
        timeline: [{ event: 'Application Submitted', at: new Date(), note: 'Created by admin' }],
      },
    });

    await profile.save();

    const populatedProfile = await WorkerProfile.findById(profile._id).populate('userId', 'name email phone address');

    res.status(201).json({
      success: true,
      message: 'Worker created successfully',
      worker: populatedProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update worker profile and user details
// @route   PUT /api/admin/workers/:id
// @access  Private (Admin only)
router.put('/workers/:id', isAdminUser, async (req, res) => {
  const { name, email, phone, password, skills, serviceArea, rating, isAvailable, jobsCompleted, address } = req.body;

  try {
    const profile = await WorkerProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const user = await User.findById(profile.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated user not found' });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(409).json({ success: false, message: 'Email already in use by another account' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) user.password = password;
    if (address) {
      user.address = {
        ...user.address,
        pincode: address.pincode || user.address.pincode,
        street: address.street || user.address.street,
        city: address.city || user.address.city,
        state: address.state || user.address.state,
      };
    }

    if (skills) {
      profile.skills = Array.isArray(skills) ? skills : skills.split(',').map((skill) => skill.trim()).filter(Boolean);
    }
    if (serviceArea) profile.serviceArea = serviceArea;
    if (rating !== undefined) profile.rating = rating;
    if (isAvailable !== undefined) profile.isAvailable = isAvailable;
    if (jobsCompleted !== undefined) profile.jobsCompleted = jobsCompleted;
    if (req.body.suspended !== undefined) {
      profile.suspended = !!req.body.suspended;
      if (profile.suspended) profile.isAvailable = false;
    }
    if (req.body.experience !== undefined) profile.experience = req.body.experience;
    if (req.body.rate !== undefined) profile.rate = req.body.rate;
    if (req.body.description !== undefined) profile.description = req.body.description;
    if (req.body.availableDays) profile.availableDays = req.body.availableDays;
    if (req.body.emergencyService !== undefined) profile.emergencyService = !!req.body.emergencyService;
    if (req.body.maxJobsPerDay !== undefined) profile.maxJobsPerDay = req.body.maxJobsPerDay;

    await user.save();
    await profile.save();

    const updatedWorker = await WorkerProfile.findById(profile._id).populate('userId', 'name email phone address');

    res.status(200).json({
      success: true,
      message: 'Worker updated successfully',
      worker: updatedWorker,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a worker account and profile
// @route   DELETE /api/admin/workers/:id
// @access  Private (Admin only)
router.delete('/workers/:id', isAdminUser, async (req, res) => {
  try {
    const profile = await WorkerProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const user = await User.findById(profile.userId);

    // Reset any active or assigned jobs for this worker
    await Ticket.updateMany(
      { workerId: profile.userId, status: { $in: ['Assigned', 'In Progress'] } },
      { $set: { workerId: null, status: 'Pending' } }
    );

    await profile.deleteOne();
    if (user) await user.deleteOne();

    res.status(200).json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get managed service list
// @route   GET /api/admin/services
// @access  Private (Admin only)
router.get('/services', isAdminUser, async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 }).lean();
    const [workerCounts, jobCounts] = await Promise.all([
      WorkerProfile.aggregate([{ $unwind: '$skills' }, { $group: { _id: '$skills', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);
    const workerMap = Object.fromEntries(workerCounts.map((c) => [c._id, c.count]));
    const jobMap = Object.fromEntries(jobCounts.map((c) => [c._id, c.count]));
    res.status(200).json({
      success: true,
      count: services.length,
      services: services.map((s) => ({
        ...s,
        workerCount: workerMap[s.name] || 0,
        jobCount: jobMap[s.name] || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a new service entry
// @route   POST /api/admin/services
// @access  Private (Admin only)
router.post('/services', isAdminUser, async (req, res) => {
  const { name, description, isActive } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Service name is required' });
  }

  try {
    const existing = await Service.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A service with this name already exists' });
    }

    const service = await Service.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive: isActive !== undefined ? !!isActive : true,
      price: req.body.price || 0,
      emergencyEnabled: !!req.body.emergencyEnabled,
    });

    res.status(201).json({ success: true, message: 'Service added successfully', service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a service entry
// @route   PUT /api/admin/services/:id
// @access  Private (Admin only)
router.put('/services/:id', isAdminUser, async (req, res) => {
  const { name, description, isActive } = req.body;

  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (name && name.trim() !== service.name) {
      const check = await Service.findOne({ name: name.trim(), _id: { $ne: service._id } });
      if (check) {
        return res.status(409).json({ success: false, message: 'A service with this name already exists' });
      }
      service.name = name.trim();
    }

    if (description !== undefined) service.description = description.trim();
    if (isActive !== undefined) service.isActive = !!isActive;
    if (req.body.price !== undefined) service.price = req.body.price;
    if (req.body.emergencyEnabled !== undefined) service.emergencyEnabled = !!req.body.emergencyEnabled;

    await service.save();

    res.status(200).json({ success: true, message: 'Service updated successfully', service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Remove a service entry
// @route   DELETE /api/admin/services/:id
// @access  Private (Admin only)
router.delete('/services/:id', isAdminUser, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    await service.deleteOne();

    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Manually assign worker to a ticket
// @route   POST /api/admin/tickets/:id/assign
// @access  Private (Admin only)
router.post('/tickets/:id/assign', isAdminUser, async (req, res) => {
  const { workerId } = req.body;

  if (!workerId) {
    return res.status(400).json({ success: false, message: 'Please provide workerId' });
  }

  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Verify worker exists
    const workerUser = await User.findOne({ _id: workerId, role: 'worker' });
    if (!workerUser) {
      return res.status(404).json({ success: false, message: 'Worker not found or invalid user role' });
    }

    // Update ticket
    ticket.workerId = workerId;
    ticket.status = 'Assigned';
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Worker assigned successfully',
      ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
