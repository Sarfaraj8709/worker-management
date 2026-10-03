import express from 'express';
import WorkerProfile from '../models/WorkerProfile.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Any logged-in user can browse the worker directory
router.use(protect);

const VERIFICATION_DOC_TYPES = ['phone', 'email', 'identity', 'address', 'drivingLicense', 'certificates', 'profilePhoto'];

const getDocStatus = (profile, docType) => {
  const v = profile.verification || {};
  const doc = v[docType];
  if (doc && doc.status) return doc.status;
  const found = (v.documents || []).find((d) => d.type === docType);
  return found ? found.status : 'not_submitted';
};

// Public-facing shape for a worker card/profile
const mapWorkerCard = (profile) => {
  const user = profile.userId || {};
  const v = profile.verification || {};
  const required = v.requiredItems || VERIFICATION_DOC_TYPES;
  const verifiedCount = required.filter((type) => getDocStatus(profile, type) === 'verified').length;
  return {
    _id: profile._id,
    userId: user._id || profile.userId,
    name: user.name || 'Professional',
    email: user.email || '',
    phone: user.phone || '',
    skills: profile.skills || [],
    serviceArea: profile.serviceArea || '',
    rating: profile.rating ?? 5.0,
    jobsCompleted: profile.jobsCompleted ?? 0,
    isAvailable: !!profile.isAvailable && !profile.suspended,
    suspended: !!profile.suspended,
    experience: profile.experience || '',
    rate: profile.rate ?? 0,
    description: profile.description || '',
    availableDays: profile.availableDays || [],
    workingHours: profile.workingHours || { start: '09:00', end: '18:00' },
    emergencyService: !!profile.emergencyService,
    verificationStatus: v.status || 'Pending',
    verifiedItems: verifiedCount,
    totalVerificationItems: required.length,
    memberSince: profile.createdAt,
  };
};

// @desc    List registered workers for customers
// @route   GET /api/workers
// @access  Private (any logged-in user)
router.get('/', async (_req, res) => {
  try {
    const profiles = await WorkerProfile.find({ suspended: { $ne: true } })
      .populate('userId', 'name email phone')
      .sort({ rating: -1, jobsCompleted: -1 })
      .limit(24);
    res.status(200).json({
      success: true,
      count: profiles.length,
      workers: profiles.map(mapWorkerCard),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get a single worker's public profile
// @route   GET /api/workers/:id
// @access  Private (any logged-in user)
router.get('/:id', async (req, res) => {
  try {
    const profile = await WorkerProfile.findById(req.params.id).populate('userId', 'name email phone');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    if (profile.suspended) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    res.status(200).json({ success: true, worker: mapWorkerCard(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
