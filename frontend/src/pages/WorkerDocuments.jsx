import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  UploadCloud,
  Trash2,
  ExternalLink,
  FileText,
  Phone,
  Mail,
  BadgeCheck,
  MapPin,
  Car,
  Camera,
  Clock3,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import {
  getMyVerification,
  uploadVerificationDocument,
  removeVerificationDocument,
  assetUrl,
} from '../services/worker';
import { VERIFICATION_DOC_TYPES, VERIFICATION_DOC_STATUS_META } from '../utils/constants';
import { resolveTone } from '../utils/tone';
import { formatDate, formatDateTime } from '../utils/format';

const DOC_ICONS = {
  phone: Phone,
  email: Mail,
  identity: BadgeCheck,
  address: MapPin,
  drivingLicense: Car,
  certificates: FileText,
  profilePhoto: Camera,
};

const DOC_HINTS = {
  phone: 'Bill / SIM details screenshot or PDF showing your active number.',
  email: 'Screenshot of an inbox or an official email id you control.',
  identity: 'Aadhaar, PAN or Passport — photo or PDF.',
  address: 'Utility bill, rent agreement or bank statement with your address.',
  drivingLicense: 'Front and back of your driving licence.',
  certificates: 'Skill certificates, ITI / diploma / degree documents.',
  profilePhoto: 'A clear, recent photo of yourself.',
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const isImage = (mime) => (mime || '').startsWith('image/');

const StatusPill = ({ status, label, icon }) => {
  const meta = VERIFICATION_DOC_STATUS_META[status] || { label: status, tone: 'neutral' };
  const tone = resolveTone(status);
  const styles = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    info: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
    neutral: 'border-slate-700 bg-slate-800/60 text-slate-300',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[tone] || styles.neutral}`}>
      <span className="text-[10px]">{icon ?? meta.icon}</span>
      {label ?? meta.label}
    </span>
  );
};

const OVERALL_STATUS = (status) => {
  switch (status) {
    case 'Approved':
      return { status: 'verified', label: 'Approved', icon: '✓' };
    case 'Under Review':
      return { status: 'pending', label: 'Under Review', icon: '⏳' };
    case 'Rejected':
      return { status: 'rejected', label: 'Rejected', icon: '✕' };
    case 'Expired':
      return { status: 'expired', label: 'Expired', icon: '⚠' };
    default:
      return { status: 'pending', label: 'Pending', icon: '⏳' };
  }
};

const WorkerDocuments = () => {
  const { toast } = useToast();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const fileRefs = useRef({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setVerification(await getMyVerification());
    } catch (err) {
      setError(err.message || 'Failed to load verification details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pickFile = (docType) => {
    fileRefs.current[docType]?.click();
  };

  const handleFile = async (docType, file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP or PDF files are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 10MB.');
      return;
    }
    setBusy(docType);
    try {
      const updated = await uploadVerificationDocument(docType, file);
      setVerification(updated);
      toast.success('Document uploaded — pending admin review');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setBusy('');
    }
  };

  const handleRemove = async (docType) => {
    if (!window.confirm('Remove this document? It will need to be uploaded again.')) return;
    setBusy(docType);
    try {
      const updated = await removeVerificationDocument(docType);
      setVerification(updated);
      toast.success('Document removed');
    } catch (err) {
      toast.error(err.message || 'Remove failed');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <XCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-100">Could not load verification</h2>
        <p className="mt-1 text-sm text-slate-400">{error}</p>
        <button
          onClick={load}
          className="mt-5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const status = verification?.status || 'Pending';
  const progress = verification?.progress || { total: 7, verified: 0, pct: 0 };
  const timeline = verification?.timeline || [];
  const docs = verification?.documents || [];
  const overall = OVERALL_STATUS(status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-teal-400 font-semibold">Worker Verification</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white tracking-tight">Documents &amp; KYC</h1>
          <p className="mt-1 text-sm text-slate-400">
            Upload the required documents below. Our team reviews each one and you will be notified of the decision.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>

      {/* Rejected / info banners */}
      {status === 'Rejected' && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <p className="font-bold text-rose-300">Verification rejected</p>
            <p className="mt-0.5 text-rose-200/80">{verification?.rejectionReason || 'Please re-upload the flagged documents to reapply.'}</p>
          </div>
        </div>
      )}
      {verification?.infoRequest && status !== 'Rejected' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          <Info className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-bold text-amber-300">Action needed from you</p>
            <p className="mt-0.5 text-amber-200/80">{verification.infoRequest}</p>
          </div>
        </div>
      )}

      {/* Overview card */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-500/30 bg-teal-500/10 text-teal-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Verification status</p>
              <div className="mt-1.5">
                <StatusPill status={overall.status} label={overall.label} icon={overall.icon} />
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            <p>
              Submitted <span className="font-semibold text-slate-200">{formatDate(verification?.submittedAt)}</span>
            </p>
            {verification?.reviewedAt && (
              <p className="mt-0.5">
                Reviewed <span className="font-semibold text-slate-200">{formatDate(verification.reviewedAt)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Verification progress</span>
            <span className="font-mono text-slate-200">{progress.verified} / {progress.total} documents verified</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{progress.pct}% complete {status === 'Approved' ? '— you are fully verified' : ''}</p>
        </div>
      </div>

      {/* Documents grid */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Documents</h2>
        <p className="text-sm text-slate-400">Each document is reviewed individually. Once verified it is locked for security.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {docs.map((doc) => {
          const meta = VERIFICATION_DOC_TYPES.find((d) => d.key === doc.type);
          const Icon = DOC_ICONS[doc.type] || FileText;
          const detail = doc.detail || {};
          const hasFile = !!detail.fileUrl;
          const isVerified = doc.status === 'verified';
          const isRejected = doc.status === 'rejected';
          const uploading = busy === doc.type;
          const label = !hasFile ? 'Upload' : isVerified ? 'Approved' : 'Replace';

          return (
            <div
              key={doc.type}
              className="glass-card rounded-3xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                    isVerified
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : isRejected
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        : hasFile
                          ? 'border-teal-500/30 bg-teal-500/10 text-teal-400'
                          : 'border-slate-700 bg-slate-950/60 text-slate-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      {doc.label}
                      {meta?.required && (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Required
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{DOC_HINTS[doc.type]}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <StatusPill status={doc.status} />
                {detail.submittedAt && <span className="text-[11px] text-slate-500">Submitted {formatDate(detail.submittedAt)}</span>}
              </div>

              {/* Uploaded file */}
              {hasFile && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  {isImage(detail.mimeType) ? (
                    <img
                      src={assetUrl(detail.fileUrl)}
                      alt={detail.originalName}
                      className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300">
                      <FileText className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-200">{detail.originalName || 'Document'}</p>
                    <p className="text-[11px] text-slate-500">{detail.mimeType || 'File'} {detail.size ? `• ${formatBytes(detail.size)}` : ''}</p>
                  </div>
                  <a
                    href={assetUrl(detail.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </a>
                </div>
              )}

              {isRejected && detail.rejectionReason && (
                <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">
                  <strong>Rejected:</strong> {detail.rejectionReason}
                </div>
              )}
              {isVerified && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved by admin
                  {detail.verifiedAt ? ` on ${formatDate(detail.verifiedAt)}` : ''}
                </p>
              )}

              {/* Actions */}
              <div className="mt-auto pt-4">
                {isVerified ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-200/90">
                    This document is approved and cannot be changed.
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => pickFile(doc.type)}
                      disabled={!!uploading}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      {label}
                    </button>
                    {hasFile && (
                      <button
                        onClick={() => handleRemove(doc.type)}
                        disabled={!!uploading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    )}
                    <input
                      ref={(el) => { fileRefs.current[doc.type] = el; }}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(doc.type, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-bold text-white">Activity timeline</h2>
        </div>
        {timeline.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No activity yet. Upload your first document to get started.</p>
        ) : (
          <ol className="mt-5 space-y-4">
            {timeline.map((event, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="flex-1 pb-1">
                  <p className="text-sm font-semibold text-slate-200">{event.event}</p>
                  {event.note && <p className="text-xs text-slate-500">{event.note}</p>}
                  <p className="text-xs text-slate-600">{formatDateTime(event.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
      </main>
    </div>
  );
};

export default WorkerDocuments;
