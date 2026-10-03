const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatINR = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '₹0';
  return inrFormatter.format(num);
};

export const formatINRCompact = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num}`;
};

export const formatNumber = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-IN');
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const timeAgo = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [label, divisor] of intervals) {
    const count = Math.floor(seconds / divisor);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
};

export const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

export const maskNumber = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length <= 4) return digits ? `XXXX XXXX ${digits}` : '—';
  return `XXXX XXXX ${digits.slice(-4)}`;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
