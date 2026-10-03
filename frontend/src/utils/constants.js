export const ROLES = [
  { value: 'user', label: 'Customer' },
  { value: 'worker', label: 'Worker' },
  { value: 'admin', label: 'Admin' },
];

export const ROLE_LABELS = { user: 'Customer', worker: 'Worker', admin: 'Admin' };

export const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export const JOB_STATUSES = [
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
];

export const JOB_STATUS_META = {
  OPEN: { label: 'Requested', tone: 'info' },
  Pending: { label: 'Searching', tone: 'warning' },
  ACCEPTED: { label: 'Accepted', tone: 'info' },
  Assigned: { label: 'Assigned', tone: 'info' },
  WORKER_ON_THE_WAY: { label: 'On The Way', tone: 'info' },
  ARRIVED: { label: 'Arrived', tone: 'info' },
  IN_PROGRESS: { label: 'In Progress', tone: 'warning' },
  Completed: { label: 'Completed', tone: 'success' },
  Cancelled: { label: 'Cancelled', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'danger' },
};

export const JOB_STATUS_SEQUENCE = [
  'OPEN',
  'Pending',
  'Assigned',
  'ACCEPTED',
  'WORKER_ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
  'Completed',
];

export const JOB_STATUS_STEPS = [
  { key: 'OPEN', label: 'Request Created' },
  { key: 'Pending', label: 'Worker Searching' },
  { key: 'Assigned', label: 'Worker Assigned' },
  { key: 'ACCEPTED', label: 'Worker Accepted' },
  { key: 'WORKER_ON_THE_WAY', label: 'Worker On The Way' },
  { key: 'ARRIVED', label: 'Arrived At Site' },
  { key: 'IN_PROGRESS', label: 'Service Started' },
  { key: 'Completed', label: 'Service Completed' },
  { key: 'Payment', label: 'Payment' },
];

export const SEVERITY_META = {
  Low: { tone: 'neutral' },
  Medium: { tone: 'info' },
  High: { tone: 'warning' },
  Emergency: { tone: 'danger' },
};

export const VERIFICATION_STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected'];

export const VERIFICATION_STATUS_META = {
  Pending: { tone: 'warning' },
  'Under Review': { tone: 'info' },
  Approved: { tone: 'success' },
  Rejected: { tone: 'danger' },
};

export const JOB_OTP_META = {
  not_generated: { label: 'Not Generated', tone: 'neutral' },
  pending: { label: 'Pending Verification', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  expired: { label: 'Expired', tone: 'danger' },
};

export const PAYMENT_STATUS_META = {
  Paid: { tone: 'success' },
  Pending: { tone: 'warning' },
  Failed: { tone: 'danger' },
  Refunded: { tone: 'neutral' },
};

export const REVIEW_STATUS_META = {
  Visible: { tone: 'success' },
  Hidden: { tone: 'neutral' },
  Reported: { tone: 'danger' },
};

export const COMPLAINT_CATEGORIES = [
  "Worker didn't arrive",
  'Poor service',
  'Wrong price',
  'Worker behavior',
  'Payment issue',
  'Property damage',
  'Other',
];

export const COMPLAINT_PRIORITY_META = {
  Low: { tone: 'neutral' },
  Medium: { tone: 'info' },
  High: { tone: 'warning' },
  Critical: { tone: 'danger' },
};

export const COMPLAINT_STATUSES = [
  'Open',
  'Investigating',
  'Waiting for Customer',
  'Waiting for Worker',
  'Resolved',
  'Rejected',
];

export const COMPLAINT_STATUS_META = {
  Open: { tone: 'danger' },
  Investigating: { tone: 'warning' },
  'Waiting for Customer': { tone: 'info' },
  'Waiting for Worker': { tone: 'info' },
  Resolved: { tone: 'success' },
  Rejected: { tone: 'neutral' },
};

export const WORKER_AVAILABILITY_META = {
  available: { label: 'Available', tone: 'success' },
  busy: { label: 'Busy', tone: 'warning' },
  offline: { label: 'Offline', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
  pending: { label: 'Pending', tone: 'info' },
};

export const SERVICE_OPTIONS = [
  { value: 'Plumbing', label: 'Plumbing', icon: '🔧' },
  { value: 'Electrical', label: 'Electrical', icon: '⚡' },
  { value: 'Carpentry', label: 'Carpentry', icon: '🪚' },
  { value: 'Painting', label: 'Painting', icon: '🎨' },
  { value: 'Cleaning', label: 'Cleaning', icon: '🧹' },
  { value: 'AC Repair', label: 'AC Repair', icon: '❄️' },
  { value: 'Appliance Repair', label: 'Appliance Repair', icon: '🔌' },
  { value: 'Door & Window', label: 'Door & Window', icon: '🚪' },
  { value: 'General Repairs', label: 'General Repairs', icon: '🛠️' },
];

export const PROPERTY_TYPES = ['Home', 'Office', 'Rental Property', 'Shop', 'Other'];

export const AVAILABLE_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const VERIFICATION_DOC_TYPES = [
  { key: 'phone', label: 'Phone', icon: '📱', required: true },
  { key: 'email', label: 'Email', icon: '✉️', required: true },
  { key: 'identity', label: 'Identity', icon: '🪪', required: true },
  { key: 'address', label: 'Address', icon: '🏠', required: true },
  { key: 'drivingLicense', label: 'Driving License', icon: '🚗', required: false },
  { key: 'certificates', label: 'Certificates', icon: '📜', required: false },
  { key: 'profilePhoto', label: 'Profile Photo', icon: '📷', required: true },
];

export const VERIFICATION_DOC_STATUS_META = {
  verified: { label: 'Verified', tone: 'success', icon: '✓' },
  pending: { label: 'Pending', tone: 'warning', icon: '⏳' },
  rejected: { label: 'Rejected', tone: 'danger', icon: '✕' },
  not_submitted: { label: 'Not Submitted', tone: 'neutral', icon: '—' },
  expired: { label: 'Expired', tone: 'danger', icon: '⚠' },
};

export const OVERALL_VERIFICATION_META = {
  'Fully Verified': { label: 'Fully Verified', tone: 'success', icon: '🟢' },
  'Partially Verified': { label: 'Partially Verified', tone: 'warning', icon: '🟡' },
  'Verification Rejected': { label: 'Verification Rejected', tone: 'danger', icon: '🔴' },
  'Pending Review': { label: 'Pending Review', tone: 'info', icon: '🔵' },
  'Not Verified': { label: 'Not Verified', tone: 'neutral', icon: '⚪' },
};

export const VERIFICATION_LIST_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'Fully Verified', label: 'Fully Verified' },
  { value: 'Partially Verified', label: 'Partially Verified' },
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Verification Rejected', label: 'Rejected' },
  { value: 'Not Verified', label: 'Not Verified' },
];
