/**
 * DEVELOPMENT-ONLY mock data.
 *
 * This module is ONLY used when `VITE_ADMIN_DEV_MOCK === "true"` and the app is
 * running in dev mode. It exists so admin screens can be previewed while the
 * backend admin endpoints are still being built. It is intentionally isolated:
 *  - Single file, easy to delete.
 *  - Never imported by production code paths (gated in services/admin.js).
 *  - No secret or sensitive values.
 *
 * To preview: create `frontend/.env.local` with
 *   VITE_ADMIN_DEV_MOCK=true
 *
 * Set to false or remove the file to hit the real backend.
 */

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const names = {
  users: ['Amit Sharma', 'Priya Patel', 'Rahul Kumar', 'Sneha Iyer', 'Vikram Singh', 'Anjali Mehta', 'Rohan Das', 'Pooja Nair', 'Karan Malhotra', 'Divya Rao', 'Manish Gupta', 'Neha Joshi', 'Arjun Verma', 'Kavita Shah', 'Suresh Pillai'],
  workers: ['Ramesh Kumar', 'Sunil Patil', 'Jagdish Suthar', 'Sandeep Yadav', 'Manoj Tiwari', 'Ashok Kulkarni', 'Rajesh Nair', 'Deepak Shetty', 'Vijay Chauhan', 'Prakash Bhat'],
  categories: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'AC Repair', 'Appliance Repair', 'Door & Window'],
  skills: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'AC Repair', 'Appliance Repair', 'Door & Window', 'General Repairs'],
  cities: ['Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai'],
  methods: ['UPI', 'Card', 'Cash', 'Netbanking'],
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const pickN = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const past = (d) => new Date(now - d * day).toISOString();
const id = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const makeUser = (name, role, i) => ({
  _id: id('usr'),
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}${i}@fixmate.in`,
  phone: `9${rand(100000000, 999999999)}`,
  role,
  status: pick(['active', 'active', 'active', 'inactive', 'suspended']),
  isActive: true,
  address: { street: `${rand(1, 400)} ${pick(['Main Road', 'MG Road', 'Link Road', 'Station Road'])}`, city: pick(names.cities), state: 'Maharashtra', pincode: String(rand(400001, 400099)) },
  createdAt: past(rand(1, 400)),
  jobs: rand(0, 30),
});

const makeWorker = (name, i) => {
  const user = makeUser(name, 'worker', i);
  const statuses = ['verified', 'pending', 'rejected', 'not_submitted', 'expired'];
  const pickStatus = () => pick(statuses);
  const makeDoc = (label, type) => ({
    label,
    type,
    status: pickStatus(),
    hasFile: true,
    submittedAt: past(rand(2, 200)),
    verifiedAt: pickStatus() === 'verified' ? past(rand(1, 100)) : null,
    rejectionReason: pickStatus() === 'rejected' ? 'Document is expired or invalid.' : '',
    note: '',
    last4: `XXXX XXXX ${String(rand(1000, 9999))}`,
  });
  const makeSubDoc = (type) => ({
    status: pickStatus(),
    verifiedAt: pickStatus() === 'verified' ? past(rand(1, 100)) : null,
    submittedAt: past(rand(2, 200)),
    rejectionReason: pickStatus() === 'rejected' ? 'Document is expired or invalid.' : '',
    documentId: `${String(rand(1000, 9999))} ${String(rand(1000, 9999))} ${String(rand(1000, 9999))}`,
  });
  const overallStatus = pick(['Fully Verified', 'Partially Verified', 'Pending Review', 'Not Verified', 'Verification Rejected']);
  const docsArray = [
    makeDoc('Phone', 'phone'),
    makeDoc('Email', 'email'),
    makeDoc('Identity Document', 'identity'),
    makeDoc('Address Proof', 'address'),
    makeDoc('Driving License', 'drivingLicense'),
    makeDoc('Certificates', 'certificates'),
    makeDoc('Profile Photo', 'profilePhoto'),
  ];
  return {
    _id: id('wrk'),
    userId: user,
    skills: pickN(names.skills, rand(1, 3)),
    rating: Math.round((rand(30, 50) / 10) * 10) / 10,
    isAvailable: Math.random() > 0.4,
    serviceArea: user.address.pincode,
    jobsCompleted: rand(0, 120),
    earnings: rand(20000, 800000),
    verification: {
      status: overallStatus === 'Fully Verified' ? 'Approved' : overallStatus === 'Verification Rejected' ? 'Rejected' : overallStatus === 'Not Verified' ? 'Pending' : 'Under Review',
      overallStatus,
      progress: { total: 7, verified: docsArray.filter((d) => d.status === 'verified').length, pct: 0 },
      phoneVerified: true,
      emailVerified: true,
      identitySubmitted: true,
      risk: pick(['Low', 'Medium', 'High']),
      rejectionReason: '',
      infoRequest: '',
      submittedAt: past(rand(1, 60)),
      reviewedAt: past(rand(1, 30)),
      documents: docsArray,
      documentsDetail: {
        phone: makeSubDoc('phone'),
        email: makeSubDoc('email'),
        identity: makeSubDoc('identity'),
        address: makeSubDoc('address'),
        drivingLicense: makeSubDoc('drivingLicense'),
        certificates: makeSubDoc('certificates'),
        profilePhoto: makeSubDoc('profilePhoto'),
      },
      timeline: [
        { event: 'Application Submitted', at: past(rand(10, 50)), note: 'Worker submitted documents' },
        { event: 'Identity approved', at: past(rand(5, 40)), note: 'Identity document verified' },
        { event: 'Address approved', at: past(rand(3, 35)), note: 'Address proof verified' },
        { event: 'Driving License submitted', at: past(rand(1, 10)), note: 'Worker submitted new driving license' },
      ],
      requiredItems: ['phone', 'email', 'identity', 'address', 'drivingLicense', 'certificates', 'profilePhoto'],
    },
    createdAt: past(rand(1, 300)),
  };
};

const makeJob = (i) => {
  const customer = makeUser(pick(names.users), 'user', i);
  const worker = Math.random() > 0.25 ? makeWorker(pick(names.workers), i) : null;
  const status = pick(['OPEN', 'Pending', 'Assigned', 'ACCEPTED', 'WORKER_ON_THE_WAY', 'IN_PROGRESS', 'Completed', 'Cancelled', 'Completed']);
  const category = pick(names.categories);
  const price = [499, 549, 650, 720, 850, 950, 1200][rand(0, 6)];
  return {
    _id: id('tkt'),
    title: `${category} ${pick(['repair', 'inspection', 'fixing', 'installation', 'maintenance'])} requested`,
    category,
    status,
    severity: pick(['Low', 'Medium', 'High', 'Emergency']),
    description: 'Customer reported an issue and is looking for an experienced professional to resolve it promptly.',
    amount: price,
    createdAt: past(rand(0, 60)),
    location: { address: customer.address.street, pincode: customer.address.pincode },
    userId: customer,
    workerId: worker ? worker.userId : null,
    timeline: [
      { status: 'Created', at: past(rand(0, 3)) },
      { status: 'Assigned', at: past(rand(0, 2)) },
    ],
  };
};

const makeReview = (i) => {
  const customer = makeUser(pick(names.users), 'user', i);
  const worker = makeWorker(pick(names.workers), i);
  return {
    _id: id('rev'),
    rating: rand(1, 5),
    comment: pick([
      'Very professional and punctual. Would recommend.',
      'Good work but arrived a bit late.',
      'Excellent service, highly skilled professional.',
      'Average experience, did not meet expectations.',
      'Quick fix and fair pricing.',
    ]),
    userId: customer,
    workerId: worker.userId,
    jobId: id('tkt'),
    status: pick(['Visible', 'Visible', 'Visible', 'Hidden', 'Reported']),
    createdAt: past(rand(0, 120)),
  };
};

const makeComplaint = (i) => {
  const customer = makeUser(pick(names.users), 'user', i);
  const worker = makeWorker(pick(names.workers), i);
  return {
    _id: id('cmp'),
    complaintId: `CMP-${String(10000 + i)}`,
    userId: customer,
    workerId: worker.userId,
    jobId: id('tkt'),
    category: pick(["Worker didn't arrive", 'Poor service', 'Wrong price', 'Worker behavior', 'Payment issue', 'Property damage', 'Other']),
    priority: pick(['Low', 'Medium', 'High', 'Critical']),
    status: pick(['Open', 'Investigating', 'Waiting for Customer', 'Waiting for Worker', 'Resolved', 'Rejected']),
    description: 'Customer has reported an issue with the recently completed service and expects the platform to resolve it.',
    createdAt: past(rand(0, 30)),
    evidence: [],
    timeline: [{ status: 'Complaint submitted', at: past(rand(0, 5)) }],
  };
};

const build = () => {
  const users = names.users.map((n, i) => makeUser(n, i % 7 === 0 ? 'admin' : 'user', i));
  const workers = names.workers.map((n, i) => makeWorker(n, i));
  const jobs = Array.from({ length: 38 }, (_, i) => makeJob(i));
  const reviews = Array.from({ length: 24 }, (_, i) => makeReview(i));
  const complaints = Array.from({ length: 12 }, (_, i) => makeComplaint(i));

  const revenue = (days, seed = 0) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date(now - (days - 1 - i) * day);
      return {
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: Math.round((400 + ((i + seed) * 173 % 500)) * 80),
      };
    });

  return {
    metrics: {
      users: { total: users.length + 12400, newThisMonth: 148, active: 8100 },
      workers: { total: workers.length + 1800, newThisMonth: 42, active: 980, averageRating: 4.7 },
      jobs: {
        total: 28933,
        active: jobs.filter((j) => !['Completed', 'Cancelled', 'EXPIRED'].includes(j.status)).length,
        pending: jobs.filter((j) => ['OPEN', 'Pending'].includes(j.status)).length,
        assigned: jobs.filter((j) => j.status === 'Assigned').length,
        inProgress: jobs.filter((j) => j.status === 'IN_PROGRESS').length,
        completed: 28491,
        cancelled: 214,
      },
      revenue: { total: 2450000, pending: 85000, refunded: 42000, growth: 18.4 },
      verificationPending: 27,
      services: 8,
    },
    revenue,
    jobAnalytics: { new: 48, assigned: 22, inProgress: 15, completed: 312, cancelled: 9 },
    recentActivity: [
      { id: 1, icon: 'approve', title: 'Rahul Kumar was approved as a worker', time: past(0.002) },
      { id: 2, icon: 'ticket', title: 'New service request created', time: past(0.004) },
      { id: 3, icon: 'payment', title: 'Payment received of ₹850', time: past(0.007) },
      { id: 4, icon: 'complaint', title: 'Customer submitted a complaint', time: past(0.01) },
      { id: 5, icon: 'verify', title: 'New worker verification request', time: past(0.02) },
      { id: 6, icon: 'emergency', title: 'Emergency request waiting for worker', time: past(0.03) },
    ],
    users,
    workers,
    jobs,
    reviews,
    complaints,
    verifications: workers.map((w) => ({ ...w, status: w.verification.status })).filter((w) => ['Pending', 'Under Review'].includes(w.status)).concat(workers.slice(2, 6)),
    payments: Array.from({ length: 26 }, (_, i) => {
      const job = makeJob(i);
      return {
        _id: id('pay'),
        transactionId: `TXN${String(10000000 + i)}`,
        userId: job.userId,
        workerId: job.workerId,
        jobId: job._id,
        amount: job.amount,
        method: pick(names.methods),
        status: pick(['Paid', 'Paid', 'Paid', 'Pending', 'Failed', 'Refunded']),
        createdAt: past(rand(0, 60)),
      };
    }),
    coupons: [
      { _id: id('cpn'), code: 'WELCOME20', type: 'percent', value: 20, minOrder: 500, maxDiscount: 200, validFrom: past(0), validTo: past(-31), usageLimit: 1000, usageCount: 214, isActive: true },
      { _id: id('cpn'), code: 'FESTIVE50', type: 'percent', value: 50, minOrder: 1000, maxDiscount: 500, validFrom: past(-10), validTo: past(-50), usageLimit: 500, usageCount: 89, isActive: true },
      { _id: id('cpn'), code: 'FLAT200', type: 'flat', value: 200, minOrder: 800, maxDiscount: 200, validFrom: past(-5), validTo: past(-20), usageLimit: 300, usageCount: 45, isActive: false },
    ],
    packages: [
      { _id: id('pkg'), name: 'Home Maintenance', description: 'Quarterly preventive maintenance for your home.', price: 1499, billingCycle: 'monthly', includedServices: ['Plumbing inspection', 'Electrical inspection', 'AC inspection', 'Priority support'], discount: 10, isActive: true },
      { _id: id('pkg'), name: 'Annual Care Plan', description: 'Full year of priority service visits and support.', price: 9999, billingCycle: 'yearly', includedServices: ['2x quarterly inspections', 'Priority support', 'Free minor fixes'], discount: 15, isActive: true },
    ],
    emergency: [
      { _id: id('emg'), title: 'Water Leakage', category: 'Plumbing', distance: '2.1 km', status: 'Searching for worker...', severity: 'Emergency', createdAt: past(0.01) },
      { _id: id('emg'), title: 'Electrical Emergency', category: 'Electrical', distance: '1.4 km', status: 'Worker Assigned', severity: 'Emergency', createdAt: past(0.02) },
      { _id: id('emg'), title: 'AC Breakdown', category: 'AC Repair', distance: '3.2 km', status: 'Worker On The Way', severity: 'Emergency', createdAt: past(0.04) },
    ],
    notifications: [
      { _id: id('ntf'), type: 'verify', title: 'New worker verification request', body: 'Rahul Kumar submitted identity documents.', createdAt: past(0.002), read: false },
      { _id: id('ntf'), type: 'complaint', title: 'Critical complaint submitted', body: 'CMP-10234 marked as Critical priority.', createdAt: past(0.004), read: false },
      { _id: id('ntf'), type: 'emergency', title: 'Emergency request waiting for worker', body: 'Water Leakage is searching for a worker.', createdAt: past(0.01), read: false },
      { _id: id('ntf'), type: 'payment', title: 'Payment failed', body: 'TXN10002342 failed for job JOB-8291.', createdAt: past(0.02), read: true },
      { _id: id('ntf'), type: 'report', title: 'Worker account reported', body: 'A customer reported worker account WM-10203.', createdAt: past(0.05), read: true },
    ],
    auditLogs: [
      { _id: id('log'), admin: 'System Admin', action: 'Approved worker', entity: 'Rahul Kumar', entityType: 'Worker', timestamp: past(0.02), previousValue: null, newValue: 'Approved' },
      { _id: id('log'), admin: 'System Admin', action: 'Suspended worker', entity: 'Amit Singh', entityType: 'Worker', timestamp: past(0.05), previousValue: 'Active', newValue: 'Suspended' },
      { _id: id('log'), admin: 'System Admin', action: 'Updated service', entity: 'Plumbing', entityType: 'Service', timestamp: past(0.6), previousValue: '₹299', newValue: '₹350' },
      { _id: id('log'), admin: 'System Admin', action: 'Created coupon', entity: 'WELCOME20', entityType: 'Coupon', timestamp: past(1.2), previousValue: null, newValue: '20% off' },
    ],
    analytics: {
      users: { new: 148, active: 8100, retention: 62, customers: 10600, workers: 1830 },
      workers: { new: 42, verified: 1542, active: 980, utilization: 71, averageRating: 4.7 },
      jobs: { requests: 28933, completionRate: 92, cancellationRate: 4.2, avgCompletionHours: 6.4 },
      revenue: { gross: 2450000, net: 1837500, payouts: 612500, commission: 18.4, refunds: 42000 },
      services: [
        { name: 'Plumbing', pct: 32 },
        { name: 'Electrical', pct: 21 },
        { name: 'Cleaning', pct: 18 },
        { name: 'Carpentry', pct: 15 },
        { name: 'AC Repair', pct: 14 },
      ],
    },
    settings: {
      general: { platformName: 'FixMate', supportEmail: 'support@fixmate.in', supportPhone: '+91 90000 00000', timezone: 'Asia/Kolkata', currency: 'INR' },
      jobs: { autoAssignment: true, maxAssignmentRadius: 10, jobCancellationTime: 60, emergencyMode: true },
      workers: { requireVerification: true, minimumRating: 3.5, maximumActiveJobs: 5 },
      notifications: { email: true, sms: false, push: true },
      security: { sessionManagement: true, loginAttempts: 5, passwordPolicy: 'strong' },
    },
    reports: ['User Report', 'Worker Report', 'Job Report', 'Revenue Report', 'Payment Report', 'Complaint Report', 'Service Report'],
    search: (q) => {
      const term = String(q || '').toLowerCase();
      if (!term) return { users: [], workers: [], jobs: [], services: [], transactions: [], complaints: [] };
      return {
        users: users.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)).slice(0, 5),
        workers: workers.filter((w) => w.userId.name.toLowerCase().includes(term) || (w.skills || []).some((s) => s.toLowerCase().includes(term))).slice(0, 5),
        jobs: jobs.filter((j) => j.title.toLowerCase().includes(term) || j.category.toLowerCase().includes(term)).slice(0, 5),
        services: names.categories.filter((s) => s.toLowerCase().includes(term)).map((s) => ({ name: s })),
        transactions: [],
        complaints: complaints.filter((c) => c.complaintId.toLowerCase().includes(term)).slice(0, 5),
      };
    },
  };
};

const mockDb = build();

export default mockDb;
