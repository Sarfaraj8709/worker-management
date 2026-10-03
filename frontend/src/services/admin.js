import axios from 'axios';
import devMock from './devMock';

/**
 * Admin API service layer.
 *
 * Axios baseURL / credentials are configured in src/context/AuthContext.jsx
 * (`axios.defaults.baseURL = 'http://localhost:5000/api'`). No hardcoded hosts
 * are used in components.
 *
 * ---------------------------------------------------------------------------
 * ENDPOINTS THAT EXIST TODAY (backend/routes/admin.js)
 *   GET    /admin/metrics
 *   GET    /admin/unassigned
 *   GET    /admin/workers
 *   POST   /admin/workers
 *   PUT    /admin/workers/:id
 *   DELETE /admin/workers/:id
 *   GET    /admin/services
 *   POST   /admin/services
 *   PUT    /admin/services/:id
 *   DELETE /admin/services/:id
 *   POST   /admin/tickets/:id/assign
 *
 * ENDPOINTS STILL REQUIRED FROM THE BACKEND (frontend already wired to call
 * them — they will 404 until implemented):
 *   GET    /admin/users
 *   PATCH  /admin/users/:id
 *   DELETE /admin/users/:id
 *   GET    /admin/users/:id
 *   GET    /admin/jobs
 *   GET    /admin/jobs/:id
 *   PATCH  /admin/tickets/:id/status
 *   GET    /admin/reviews
 *   PATCH  /admin/reviews/:id
 *   DELETE /admin/reviews/:id
 *   GET    /admin/verifications
 *   GET    /admin/verifications/:id
 *   POST   /admin/verifications/:id/approve
 *   POST   /admin/verifications/:id/reject
 *   POST   /admin/verifications/:id/request-info
 *   GET    /admin/payments
 *   GET    /admin/payments/:id
 *   GET    /admin/complaints
 *   GET    /admin/complaints/:id
 *   PATCH  /admin/complaints/:id
 *   GET    /admin/coupons
 *   POST   /admin/coupons
 *   PUT    /admin/coupons/:id
 *   DELETE /admin/coupons/:id
 *   GET    /admin/packages
 *   POST   /admin/packages
 *   PUT    /admin/packages/:id
 *   DELETE /admin/packages/:id
 *   GET    /admin/emergency
 *   GET    /admin/analytics
 *   GET    /admin/reports
 *   GET    /admin/reports/export
 *   GET    /admin/settings
 *   PUT    /admin/settings
 *   GET    /admin/notifications
 *   POST   /admin/notifications/read
 *   GET    /admin/audit-logs
 *   GET    /admin/search?q=
 */

const DEV_MOCK_ENABLED =
  import.meta.env.DEV && String(import.meta.env.VITE_ADMIN_DEV_MOCK) === 'true';

export const mockModeEnabled = DEV_MOCK_ENABLED;

export class MissingEndpointError extends Error {
  constructor(url) {
    super(`Backend endpoint ${url} is not implemented yet.`);
    this.name = 'MissingEndpointError';
    this.url = url;
    this.isMissingEndpoint = true;
  }
}

export const getErrorMessage = (err) => {
  if (err instanceof MissingEndpointError) return err.message;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return 'Network error. Check your connection and try again.';
  if (err?.response) {
    const status = err.response.status;
    if (status === 401) return 'Session expired. Please log in again.';
    if (status === 403) return 'You are not authorized to perform this action.';
    if (status === 404) return 'This feature is not available yet (endpoint not found).';
    if (status >= 500) return 'Server error. Please try again later.';
  }
  return err?.message || 'Something went wrong.';
};

export const isMissingEndpoint = (err) => err?.isMissingEndpoint || err?.response?.status === 404;

/** Convert a 404 on an admin endpoint into a descriptive MissingEndpointError. */
const toMissing = (url) => (err) => {
  if (err?.response?.status === 404) {
    throw new MissingEndpointError(url);
  }
  throw err;
};

// ---------------------------------------------------------------------------
// Mock dispatcher (development only, see devMock.js)
// ---------------------------------------------------------------------------
const runMock = (method, url, body) => {
  const match = (m, u) => method.toLowerCase() === m.toLowerCase() && url.startsWith(u);
  if (match('GET', '/admin/metrics')) return devMock.metrics;
  if (match('GET', '/admin/unassigned')) return { count: 0, tickets: [] };
  if (match('GET', '/admin/workers')) return devMock.workers;
  if (match('POST', '/admin/workers')) return body;
  if (match('PUT', '/admin/workers/')) return body;
  if (match('DELETE', '/admin/workers/')) return { message: 'Worker deleted' };
  if (match('GET', '/admin/services')) return devMock.jobs.map(() => ({}));
  if (match('POST', '/admin/services')) return body;
  if (match('PUT', '/admin/services/')) return body;
  if (match('DELETE', '/admin/services/')) return { message: 'Service deleted' };
  if (match('POST', '/admin/tickets/')) return { message: 'Assigned' };
  if (match('GET', '/admin/users')) return devMock.users;
  if (match('GET', '/admin/users/')) return devMock.users[0];
  if (match('PATCH', '/admin/users/')) return body;
  if (match('DELETE', '/admin/users/')) return { message: 'User deleted' };
  if (match('GET', '/admin/jobs')) return devMock.jobs;
  if (match('GET', '/admin/jobs/')) return devMock.jobs[0];
  if (match('PATCH', '/admin/tickets/')) return body;
  if (match('GET', '/admin/reviews')) return devMock.reviews;
  if (match('PATCH', '/admin/reviews/')) return body;
  if (match('DELETE', '/admin/reviews/')) return { message: 'Review deleted' };
  if (match('GET', '/admin/verifications')) return devMock.verifications;
  if (match('GET', '/admin/verifications/')) return devMock.verifications[0];
  if (match('POST', '/admin/verifications/')) return { message: 'Updated' };
  if (match('GET', '/admin/payments')) return devMock.payments;
  if (match('GET', '/admin/payments/')) return devMock.payments[0];
  if (match('GET', '/admin/complaints')) return devMock.complaints;
  if (match('GET', '/admin/complaints/')) return devMock.complaints[0];
  if (match('PATCH', '/admin/complaints/')) return body;
  if (match('GET', '/admin/coupons')) return devMock.coupons;
  if (match('POST', '/admin/coupons')) return body;
  if (match('PUT', '/admin/coupons/')) return body;
  if (match('DELETE', '/admin/coupons/')) return { message: 'Coupon deleted' };
  if (match('GET', '/admin/packages')) return devMock.packages;
  if (match('POST', '/admin/packages')) return body;
  if (match('PUT', '/admin/packages/')) return body;
  if (match('DELETE', '/admin/packages/')) return { message: 'Package deleted' };
  if (match('GET', '/admin/emergency')) return devMock.emergency;
  if (match('GET', '/admin/analytics')) return devMock.analytics;
  if (match('GET', '/admin/reports')) return devMock.reports;
  if (match('GET', '/admin/reports/export')) return { message: 'Export generated' };
  if (match('GET', '/admin/settings')) return devMock.settings;
  if (match('PUT', '/admin/settings')) return body;
  if (match('GET', '/admin/notifications')) return devMock.notifications;
  if (match('POST', '/admin/notifications/')) return { message: 'Marked read' };
  if (match('GET', '/admin/audit-logs')) return devMock.auditLogs;
  if (match('GET', '/admin/search')) {
    const params = new URLSearchParams((url.split('?')[1] || ''));
    return devMock.search(params.get('q'));
  }
  throw new MissingEndpointError(url);
};

const request = async (method, url, data, params) => {
  if (DEV_MOCK_ENABLED) {
    return runMock(method, url, data);
  }
  const config = { method, url, data, params };
  const response = await axios.request(config);
  return response.data;
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const getAdminMetrics = () =>
  request('GET', '/admin/metrics').then((r) => r.metrics ?? r).catch(toMissing('/admin/metrics'));

export const getUnassignedTickets = () =>
  request('GET', '/admin/unassigned')
    .then((r) => (Array.isArray(r) ? r : r.tickets ?? []))
    .catch(toMissing('/admin/unassigned'));

export const getRevenueSeries = async (range = '30d') => {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '3m' ? 90 : 365;
  const data = await request('GET', '/admin/analytics', undefined, { days }).catch(() => null);
  const analytics = data?.analytics ?? data;
  if (analytics?.revenue?.series) return analytics.revenue.series;
  if (Array.isArray(analytics?.revenue)) return analytics.revenue;
  if (DEV_MOCK_ENABLED) return devMock.revenue(days);
  throw new MissingEndpointError('GET /admin/analytics (revenue series)');
};

export const getAnalytics = () =>
  request('GET', '/admin/analytics').then((r) => r.analytics ?? r).catch(toMissing('/admin/analytics'));

export const getRecentActivity = async () => {
  const data = await request('GET', '/admin/audit-logs').catch(() => null);
  if (DEV_MOCK_ENABLED) return devMock.recentActivity;
  const logs = Array.isArray(data) ? data : data?.logs;
  if (Array.isArray(logs)) {
    return logs.slice(0, 8).map((log) => ({
      id: log._id,
      icon: 'ticket',
      title: `${log.admin} ${String(log.action || '').toLowerCase()} ${log.entity || ''}`.trim(),
      time: log.timestamp || log.createdAt,
    }));
  }
  throw new MissingEndpointError('GET /admin/audit-logs');
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const getUsers = (params) =>
  request('GET', '/admin/users', undefined, params)
    .then((r) => (Array.isArray(r) ? r : r.users ?? []))
    .catch(toMissing('/admin/users'));

export const getUserDetails = (id) =>
  request('GET', `/admin/users/${id}`)
    .then((r) => r.user ?? r)
    .catch(toMissing(`/admin/users/${id}`));

export const updateUser = (id, patch) =>
  request('PATCH', `/admin/users/${id}`, patch)
    .then((r) => r.user ?? r)
    .catch(toMissing(`/admin/users/${id}`));

export const deleteUser = (id) =>
  request('DELETE', `/admin/users/${id}`)
    .then((r) => r)
    .catch(toMissing(`/admin/users/${id}`));

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------
export const getWorkers = (params) =>
  request('GET', '/admin/workers', undefined, params)
    .then((r) => (Array.isArray(r) ? r : r.workers ?? []))
    .catch(toMissing('/admin/workers'));

export const getWorkerById = (id) =>
  request('GET', `/admin/workers/${id}`)
    .then((r) => r.worker ?? r)
    .catch(async (err) => {
      if (err?.response?.status === 404) {
        const all = await getWorkers();
        return all.find((w) => w._id === id) || null;
      }
      throw err;
    });

export const createWorker = (payload) =>
  request('POST', '/admin/workers', payload)
    .then((r) => r.worker ?? r)
    .catch((err) => {
      throw err;
    });

export const updateWorker = (id, payload) =>
  request('PUT', `/admin/workers/${id}`, payload)
    .then((r) => r.worker ?? r)
    .catch(toMissing(`/admin/workers/${id}`));

export const deleteWorker = (id) =>
  request('DELETE', `/admin/workers/${id}`)
    .then((r) => r)
    .catch(toMissing(`/admin/workers/${id}`));

// ---------------------------------------------------------------------------
// Worker verification
// ---------------------------------------------------------------------------
export const getVerifications = (params) =>
  request('GET', '/admin/verifications', undefined, params)
    .then((r) => (Array.isArray(r) ? r : r.verifications ?? []))
    .catch(toMissing('/admin/verifications'));

export const getVerificationDetails = (id) =>
  request('GET', `/admin/verifications/${id}`)
    .then((r) => r.verification ?? r)
    .catch(toMissing(`/admin/verifications/${id}`));

export const approveVerification = (id) =>
  request('POST', `/admin/verifications/${id}/approve`)
    .then((r) => r)
    .catch(toMissing(`/admin/verifications/${id}/approve`));

export const rejectVerification = (id, reason) =>
  request('POST', `/admin/verifications/${id}/reject`, { reason })
    .then((r) => r)
    .catch(toMissing(`/admin/verifications/${id}/reject`));

export const requestVerificationInfo = (id, note) =>
  request('POST', `/admin/verifications/${id}/request-info`, { note })
    .then((r) => r)
    .catch(toMissing(`/admin/verifications/${id}/request-info`));

export const updateVerificationDocument = (workerId, docType, payload) =>
  request('POST', `/admin/verifications/${workerId}/documents/${docType}`, payload)
    .then((r) => r.verification ?? r)
    .catch(toMissing(`/admin/verifications/${workerId}/documents/${docType}`));

export const approveVerificationDocument = (workerId, docType) =>
  updateVerificationDocument(workerId, docType, { status: 'verified' });

export const rejectVerificationDocument = (workerId, docType, reason) =>
  updateVerificationDocument(workerId, docType, { status: 'rejected', rejectionReason: reason });

export const requestVerificationDocumentInfo = (workerId, docType, note) =>
  updateVerificationDocument(workerId, docType, { status: 'pending', note });

export const getWorkerVerification = (workerId) =>
  request('GET', `/admin/workers/${workerId}`)
    .then((r) => r.worker?.verification ?? r.verification ?? r)
    .catch(toMissing(`/admin/workers/${workerId}`));

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export const getServices = () =>
  request('GET', '/admin/services')
    .then((r) => (Array.isArray(r) ? r : r.services ?? []))
    .catch(toMissing('/admin/services'));

export const createService = (payload) =>
  request('POST', '/admin/services', payload)
    .then((r) => r.service ?? r)
    .catch((err) => {
      throw err;
    });

export const updateService = (id, payload) =>
  request('PUT', `/admin/services/${id}`, payload)
    .then((r) => r.service ?? r)
    .catch(toMissing(`/admin/services/${id}`));

export const deleteService = (id) =>
  request('DELETE', `/admin/services/${id}`)
    .then((r) => r)
    .catch(toMissing(`/admin/services/${id}`));

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export const getJobs = (params) =>
  request('GET', '/admin/jobs', undefined, params)
    .then((r) => (Array.isArray(r) ? r : r.jobs ?? []))
    .catch(toMissing('/admin/jobs'));

export const getJobDetails = (id) =>
  request('GET', `/admin/jobs/${id}`)
    .then((r) => r.job ?? r)
    .catch(toMissing(`/admin/jobs/${id}`));

export const updateJobStatus = (id, status) =>
  request('PATCH', `/admin/tickets/${id}/status`, { status })
    .then((r) => r.ticket ?? r)
    .catch(toMissing(`/admin/tickets/${id}/status`));

export const assignWorkerToTicket = (id, workerId) =>
  request('POST', `/admin/tickets/${id}/assign`, { workerId })
    .then((r) => r.ticket ?? r)
    .catch((err) => {
      throw err;
    });

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export const getPayments = (params) =>
  request('GET', '/admin/payments', undefined, params)
    .then((r) => {
      if (Array.isArray(r)) return r;
      const list = r.payments ?? [];
      list.totals = r.totals;
      return list;
    })
    .catch(toMissing('/admin/payments'));

export const getPaymentDetails = (id) =>
  request('GET', `/admin/payments/${id}`)
    .then((r) => r.payment ?? r)
    .catch(toMissing(`/admin/payments/${id}`));

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const getReviews = (params) =>
  request('GET', '/admin/reviews', undefined, params)
    .then((r) => (Array.isArray(r) ? r : r.reviews ?? []))
    .catch(toMissing('/admin/reviews'));

export const moderateReview = (id, patch) =>
  request('PATCH', `/admin/reviews/${id}`, patch)
    .then((r) => r.review ?? r)
    .catch(toMissing(`/admin/reviews/${id}`));

export const deleteReview = (id) =>
  request('DELETE', `/admin/reviews/${id}`)
    .then((r) => r)
    .catch(toMissing(`/admin/reviews/${id}`));

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------
export const getComplaints = (params) =>
  request('GET', '/admin/complaints', undefined, params)
    .then((r) => (Array.isArray(r) ? r : r.complaints ?? []))
    .catch(toMissing('/admin/complaints'));

export const getComplaintDetails = (id) =>
  request('GET', `/admin/complaints/${id}`)
    .then((r) => r.complaint ?? r)
    .catch(toMissing(`/admin/complaints/${id}`));

export const updateComplaint = (id, patch) =>
  request('PATCH', `/admin/complaints/${id}`, patch)
    .then((r) => r.complaint ?? r)
    .catch(toMissing(`/admin/complaints/${id}`));

// ---------------------------------------------------------------------------
// Promotions / Coupons
// ---------------------------------------------------------------------------
export const getCoupons = () =>
  request('GET', '/admin/coupons')
    .then((r) => (Array.isArray(r) ? r : r.coupons ?? []))
    .catch(toMissing('/admin/coupons'));

export const createCoupon = (payload) =>
  request('POST', '/admin/coupons', payload)
    .then((r) => r.coupon ?? r)
    .catch(toMissing('/admin/coupons'));

export const updateCoupon = (id, payload) =>
  request('PUT', `/admin/coupons/${id}`, payload)
    .then((r) => r.coupon ?? r)
    .catch(toMissing(`/admin/coupons/${id}`));

export const deleteCoupon = (id) =>
  request('DELETE', `/admin/coupons/${id}`)
    .then((r) => r)
    .catch(toMissing(`/admin/coupons/${id}`));

// ---------------------------------------------------------------------------
// Service packages
// ---------------------------------------------------------------------------
export const getPackages = () =>
  request('GET', '/admin/packages')
    .then((r) => (Array.isArray(r) ? r : r.packages ?? []))
    .catch(toMissing('/admin/packages'));

export const createPackage = (payload) =>
  request('POST', '/admin/packages', payload)
    .then((r) => r.pkg ?? r)
    .catch(toMissing('/admin/packages'));

export const updatePackage = (id, payload) =>
  request('PUT', `/admin/packages/${id}`, payload)
    .then((r) => r.pkg ?? r)
    .catch(toMissing(`/admin/packages/${id}`));

export const deletePackage = (id) =>
  request('DELETE', `/admin/packages/${id}`)
    .then((r) => r)
    .catch(toMissing(`/admin/packages/${id}`));

// ---------------------------------------------------------------------------
// Emergency services
// ---------------------------------------------------------------------------
export const getEmergencyRequests = () =>
  request('GET', '/admin/emergency')
    .then((r) => {
      if (Array.isArray(r)) return r;
      const list = r.requests ?? [];
      list.config = r.config;
      return list;
    })
    .catch(toMissing('/admin/emergency'));

export const updateEmergencyConfig = (services) =>
  request('PUT', '/admin/emergency/config', { services })
    .then((r) => r.config ?? r)
    .catch(toMissing('/admin/emergency/config'));

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const getReports = () =>
  request('GET', '/admin/reports')
    .then((r) => (Array.isArray(r) ? r : r.reports ?? []))
    .catch(toMissing('/admin/reports'));

export const exportReport = async (report, filters) => {
  if (DEV_MOCK_ENABLED) throw new MissingEndpointError('/admin/reports/export');
  try {
    const response = await axios.request({
      method: 'GET',
      url: '/admin/reports/export',
      params: { report, ...filters },
      responseType: 'blob',
    });
    return response.data;
  } catch (err) {
    if (err?.response?.status === 404) throw new MissingEndpointError('/admin/reports/export');
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export const getSettings = () =>
  request('GET', '/admin/settings')
    .then((r) => r.settings ?? r)
    .catch(toMissing('/admin/settings'));

export const updateSettings = (settings) =>
  request('PUT', '/admin/settings', settings)
    .then((r) => r.settings ?? r)
    .catch(toMissing('/admin/settings'));

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const getNotifications = () =>
  request('GET', '/admin/notifications')
    .then((r) => (Array.isArray(r) ? r : r.notifications ?? []))
    .catch(toMissing('/admin/notifications'));

export const markNotificationsRead = () =>
  request('POST', '/admin/notifications/read')
    .then((r) => r)
    .catch(toMissing('/admin/notifications/read'));

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export const getAuditLogs = (params) =>
  request('GET', '/admin/audit-logs', undefined, params)
    .then((r) => (Array.isArray(r) ? r : r.logs ?? []))
    .catch(toMissing('/admin/audit-logs'));

// ---------------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------------
export const globalSearch = (query) =>
  request('GET', '/admin/search', undefined, { q: query })
    .then((r) => r)
    .catch(toMissing('/admin/search'));

export const getProperties = () =>
  request('GET', '/admin/properties')
    .then((r) => (Array.isArray(r) ? r : r.properties ?? []))
    .catch(toMissing('/admin/properties'));
