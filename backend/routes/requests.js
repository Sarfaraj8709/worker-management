import express from 'express';
import Ticket from '../models/Ticket.js';
import WorkerProfile from '../models/WorkerProfile.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const workerAuth = [protect, authorize('worker')];

const severityPriority = {
  Emergency: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Maps the different naming schemes used across the app (ticket categories,
// service names, and worker skills) so they reliably match each other.
// e.g. ticket category "AC & Cooling" must match a worker skill "AC Repair".
const skillAliases = {
  plumbing: ['plumber', 'pipe', 'drainage', 'bathroom'],
  electrical: ['electrician', 'electric', 'wiring', 'switch', 'light'],
  'ac & cooling': ['ac', 'ac repair', 'air conditioning', 'cooling', 'hvac', 'refrigeration'],
  'ac repair': ['ac', 'ac & cooling', 'air conditioning', 'cooling', 'hvac'],
  'door & carpenter': ['carpentry', 'carpenter', 'door', 'window', 'furniture', 'woodwork'],
  'door & window': ['door', 'window', 'carpentry', 'carpenter'],
  carpentry: ['carpenter', 'door', 'window', 'furniture', 'woodwork'],
  cleaning: ['housekeeping', 'cleaner', 'sanitization', 'deep clean', 'home cleaning'],
  'appliance repair': ['appliance', 'washing machine', 'refrigerator', 'microwave', 'tv repair'],
  painting: ['painter', 'paint'],
  'general repairs': ['repair', 'handyman', 'maintenance'],
  other: [],
};

// Build an undirected graph of equivalent names so any skill/category variant
// can reach any other (e.g. "Carpentry" <-> "Door & Carpenter").
const buildAliasGraph = () => {
  const adj = new Map();
  const add = (a, b) => {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb || na === nb) return;
    if (!adj.has(na)) adj.set(na, new Set());
    if (!adj.has(nb)) adj.set(nb, new Set());
    adj.get(na).add(nb);
    adj.get(nb).add(na);
  };
  Object.entries(skillAliases).forEach(([key, aliases]) => {
    (aliases || []).forEach((alias) => add(key, alias));
  });
  return adj;
};
const aliasGraph = buildAliasGraph();

// Collect every name equivalent to the given skill name.
const collectAliasGroup = (name) => {
  const start = normalize(name);
  const result = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    (aliasGraph.get(current) || []).forEach((neighbor) => {
      if (result.has(neighbor)) return;
      result.add(neighbor);
      queue.push(neighbor);
    });
  }
  return [...result];
};

// Build regexes that match a ticket's category for the worker's skills.
// Matching is case-insensitive and tolerant of the naming variants above.
const buildCategoryRegexes = (skills) => {
  const seen = new Set();
  const regexes = [];

  (skills || []).forEach((skill) => {
    const skillNorm = normalize(skill);
    if (!skillNorm) return;

    // "Other" skill means the worker is willing to take any request
    if (skillNorm === 'other') {
      regexes.push(/.*/);
      return;
    }

    collectAliasGroup(skillNorm).forEach((alias) => {
      if (seen.has(alias)) return;
      seen.add(alias);
      regexes.push(new RegExp('^' + escapeRegExp(alias) + '$', 'i'));
    });
  });

  return regexes;
};

// Query that finds tickets eligible for the given worker profile.
const buildEligibleTicketQuery = (profile) => {
  const conditions = [];

  conditions.push({ status: { $in: ['OPEN', 'Pending'] } });
  conditions.push({ workerId: null });

  // Empty array => matches nothing (worker without any matching skill)
  const categoryRegexes = buildCategoryRegexes(profile.skills);
  if (categoryRegexes.length > 0) {
    conditions.push({
      $or: [
        { category: { $in: categoryRegexes } },
        // "Other" problems don't fit a skill, so any available worker can take them
        { category: { $regex: /^other$/i } },
      ],
    });
  } else {
    conditions.push({ category: { $in: [] } });
  }

  if (profile.serviceArea) {
    const area = String(profile.serviceArea).trim();
    if (/^\d{5,6}$/.test(area)) {
      // Pincode: match the ticket pincode exactly
      conditions.push({ 'location.pincode': { $regex: new RegExp('^' + escapeRegExp(area) + '$', 'i') } });
    } else {
      // City/area name: match within the ticket address
      conditions.push({ 'location.address': { $regex: escapeRegExp(area), $options: 'i' } });
    }
  }

  return { $and: conditions };
};

// @desc    Get available open requests for the logged-in worker
// @route   GET /api/requests/available
// @access  Private (Worker only)
router.get('/available', workerAuth, async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    if (!profile.isAvailable) {
      return res.status(200).json({
        success: true,
        message: 'You are currently marked unavailable. Turn availability on to receive new open requests.',
        requests: [],
        count: 0,
      });
    }

    const query = buildEligibleTicketQuery(profile);

    const requests = await Ticket.find(query)
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();

    requests.sort((a, b) => {
      const aSeverity = severityPriority[a.severity] || 0;
      const bSeverity = severityPriority[b.severity] || 0;
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Accept an available request atomically
// @route   PATCH /api/requests/:id/accept
// @access  Private (Worker only)
router.patch('/:id/accept', workerAuth, async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const query = {
      _id: req.params.id,
      ...buildEligibleTicketQuery(profile),
    };

    const request = await Ticket.findOneAndUpdate(
      query,
      {
        $set: {
          workerId: req.user.id,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      },
      { new: true }
    ).populate('userId', 'name phone email');

    if (!request) {
      return res.status(400).json({
        success: false,
        message: 'This request is no longer available or you are not eligible to accept it.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Request accepted successfully. It is now assigned to you.',
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
