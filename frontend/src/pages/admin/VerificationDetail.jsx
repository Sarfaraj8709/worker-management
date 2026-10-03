import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  XCircle,
  MessageSquareText,
  Phone,
  Mail,
  BadgeCheck,
  Car,
  Camera,
  FileText,
  Clock3,
  ShieldCheck,
  MapPin,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import Avatar from '../../components/admin/Avatar';
import { StatusBadge } from '../../components/admin/Badge';
import { Textarea } from '../../components/admin/Input';
import { PageSkeleton } from '../../components/admin/Skeleton';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import Modal from '../../components/admin/Modal';
import VerificationCard from '../../components/admin/VerificationCard';
import {
  getVerificationDetails,
  approveVerification,
  rejectVerification,
  requestVerificationInfo,
  approveVerificationDocument,
  rejectVerificationDocument,
  requestVerificationDocumentInfo,
  isMissingEndpoint,
  getErrorMessage,
} from '../../services/admin';
import { assetUrl } from '../../services/worker';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateTime, maskNumber } from '../../utils/format';
import { VERIFICATION_STATUS_META, VERIFICATION_DOC_TYPES } from '../../utils/constants';

const DOC_ICONS = {
  phone: Phone,
  email: Mail,
  identity: BadgeCheck,
  address: MapPin,
  drivingLicense: Car,
  certificates: FileText,
  profilePhoto: Camera,
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const isImage = (mime) => (mime || '').startsWith('image/');

const steps = [
  { key: 'Application Submitted', icon: FileText },
  { key: 'Documents Uploaded', icon: UploadCloud },
  { key: 'Under Review', icon: Clock3 },
  { key: 'Approved', icon: CheckCircle2 },
];

const VerificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [docModal, setDocModal] = useState(null); // { action: 'reject' | 'info', docType, label }
  const [docText, setDocText] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getVerificationDetails(id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const status = data?.status || data?.verification?.status || 'Pending';
  const docs = data?.documents || data?.verification?.documents || [];
  const progress = data?.progress || data?.verification?.progress || { total: 7, verified: 0, pct: 0 };

  const approve = async () => {
    setActing(true);
    try {
      await approveVerification(id);
      toast.success('Verification approved');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const submitReject = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setActing(true);
    try {
      await rejectVerification(id, reason.trim());
      setRejectOpen(false);
      toast.success('Verification rejected');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const submitRequestInfo = async () => {
    if (!note.trim()) {
      toast.error('Please describe what information is missing');
      return;
    }
    setActing(true);
    try {
      await requestVerificationInfo(id, note.trim());
      setInfoOpen(false);
      toast.success('Request sent to worker');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleApproveDoc = async (docType) => {
    setActing(true);
    try {
      await approveVerificationDocument(id, docType);
      toast.success('Document approved');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleRejectDoc = async (docType, reasonText) => {
    if (!reasonText.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setActing(true);
    try {
      await rejectVerificationDocument(id, docType, reasonText.trim());
      setDocModal(null);
      setDocText('');
      toast.success('Document rejected');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleRequestDocInfo = async (docType, noteText) => {
    if (!noteText.trim()) {
      toast.error('Please describe what information is required');
      return;
    }
    setActing(true);
    try {
      await requestVerificationDocumentInfo(id, docType, noteText.trim());
      setDocModal(null);
      setDocText('');
      toast.success('Request sent to worker');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const submitDocAction = () => {
    if (!docModal) return;
    if (docModal.action === 'reject') handleRejectDoc(docModal.docType, docText);
    else handleRequestDocInfo(docModal.docType, docText);
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Verification details" />
        {isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={load} />}
      </div>
    );
  }

  const worker = data?.userId || {};
  const verification = data?.verification || {};
  const name = worker.name || 'Worker';

  const statusIndex = steps.findIndex((s) => s.key === status || (status === 'Rejected' && s.key === 'Approved'));
  const currentStep = status === 'Rejected' ? steps.length - 1 : statusIndex === -1 ? -1 : statusIndex;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification details"
        description={`Worker ${name}`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/admin/verification')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={name} size="lg" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{name}</h2>
                <p className="text-xs text-slate-500">
                  Worker ID: <span className="font-mono text-slate-300">WM-{String(id).slice(-5)}</span> • Submitted {formatDate(verification.submittedAt || data?.createdAt)}
                </p>
                <div className="mt-2">
                  <StatusBadge status={status} meta={VERIFICATION_STATUS_META} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
                <p className="text-2xl font-bold text-white">{progress.pct}%</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Verified</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Documents</span>
                <span className="font-mono text-slate-300">{progress.verified} / {progress.total} verified</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>

            {/* Checklist */}
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <CheckRow done={!!verification.phoneVerified} icon={Phone} label="Phone Verified" />
              <CheckRow done={!!verification.emailVerified} icon={Mail} label="Email Verified" />
              <CheckRow done={!!verification.identityVerified} icon={BadgeCheck} label="Identity Verified" />
              <CheckRow done={docs.every((d) => d.status === 'verified' && docs.length > 0)} icon={FileText} label="All Documents" pending={docs.some((d) => d.status === 'pending')} />
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-sm font-bold text-white">Documents</h3>
            <p className="text-xs text-slate-500">Review each document, then approve or reject it. Approved documents are locked.</p>
            <div className="mt-4 space-y-3">
              {docs.map((doc) => {
                const Icon = DOC_ICONS[doc.type] || FileText;
                const required = VERIFICATION_DOC_TYPES.some((d) => d.key === doc.type && d.required);
                const verifiedAt = doc.verifiedAt ? formatDate(doc.verifiedAt) : null;
                const submittedAt = doc.submittedAt ? formatDate(doc.submittedAt) : null;
                const value = doc.documentId ? maskNumber(doc.documentId) : doc.originalName ? doc.originalName : null;
                return (
                  <div key={doc.type} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                    {doc.fileUrl && (
                      <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
                        {isImage(doc.mimeType) ? (
                          <img
                            src={assetUrl(doc.fileUrl)}
                            alt={doc.originalName || doc.label}
                            className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 object-cover"
                          />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300">
                            <FileText className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-200">{doc.originalName || 'Uploaded document'}</p>
                          <p className="text-[11px] text-slate-500">{doc.mimeType || 'File'} {doc.size ? `• ${formatBytes(doc.size)}` : ''}</p>
                        </div>
                        <a
                          href={assetUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </a>
                      </div>
                    )}
                    <VerificationCard
                      label={doc.label}
                      icon={Icon}
                      value={value}
                      status={doc.status}
                      required={required}
                      verifiedAt={verifiedAt}
                      submittedAt={submittedAt}
                      rejectionReason={doc.rejectionReason}
                      note={doc.note}
                      onApprove={doc.status === 'verified' ? undefined : () => handleApproveDoc(doc.type)}
                      onReject={
                        doc.status === 'rejected' || doc.status === 'expired'
                          ? undefined
                          : () => { setDocModal({ action: 'reject', docType: doc.type, label: doc.label }); setDocText(''); }
                      }
                      onRequestInfo={() => { setDocModal({ action: 'info', docType: doc.type, label: doc.label }); setDocText(''); }}
                      onView={doc.fileUrl ? () => window.open(assetUrl(doc.fileUrl), '_blank') : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="mb-5 text-sm font-bold text-white">Verification Timeline</h3>
            <ol className="relative">
              {steps.map((step, i) => {
                const done = i <= currentStep;
                const isCurrent = status === 'Rejected' ? false : i === currentStep;
                return (
                  <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
                    {i < steps.length - 1 && (
                      <span className={`absolute left-[13px] top-7 h-full w-px ${done ? 'bg-indigo-500/50' : 'bg-slate-800'}`} />
                    )}
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                        done
                          ? 'border-emerald-500/50 bg-emerald-600 text-white'
                          : isCurrent
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                            : 'border-slate-700 bg-slate-900 text-slate-600'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : <step.icon className="h-3.5 w-3.5" />}
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className={`text-sm font-semibold ${done ? 'text-slate-100' : isCurrent ? 'text-amber-300' : 'text-slate-500'}`}>
                        {step.key}
                      </p>
                      {done && <p className="text-xs text-slate-500">{formatDateTime(verification.submittedAt || data?.createdAt)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {status === 'Rejected' && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
                <strong>Rejected.</strong> {data?.rejectionReason ? `Reason: ${data.rejectionReason}` : 'Contact the worker for details.'}
              </div>
            )}
            {verification.infoRequest && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
                <strong>Info requested:</strong> {verification.infoRequest}
              </div>
            )}

            {(data?.timeline || []).length > 0 && (
              <div className="mt-5 border-t border-slate-800 pt-5">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Event history</h4>
                <ol className="space-y-3">
                  {(data.timeline || []).map((ev, i) => (
                    <li key={i} className="flex gap-2.5 text-xs">
                      <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <div>
                        <p className="font-semibold text-slate-300">{ev.event}</p>
                        {ev.note && <p className="text-slate-500">{ev.note}</p>}
                        <p className="text-slate-600">{formatDateTime(ev.at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Actions column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-bold text-white">Admin Actions</h3>
            <div className="mt-4 space-y-2.5">
              <Button className="w-full" onClick={approve} loading={acting} disabled={status === 'Approved'}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button variant="danger" className="w-full" onClick={() => setRejectOpen(true)} disabled={status === 'Rejected'}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setInfoOpen(true)}>
                <MessageSquareText className="h-4 w-4" /> Request More Information
              </Button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Approving a worker marks their profile as verified and makes them eligible for dispatch priority.
            </p>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
              <ShieldCheck className="mb-1 h-4 w-4 text-indigo-400" />
              You can also approve or reject individual documents above. Use this for partial approvals.
            </div>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject verification" size="sm">
        <Textarea
          label="Reason for rejection"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this application is being rejected..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={submitReject} loading={acting}>Reject Verification</Button>
        </div>
      </Modal>

      {/* Request info modal */}
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Request more information" size="sm">
        <Textarea
          label="What is missing?"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe which documents or information are required..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setInfoOpen(false)}>Cancel</Button>
          <Button onClick={submitRequestInfo} loading={acting}>Request Documents</Button>
        </div>
      </Modal>

      {/* Per-document action modal */}
      <Modal
        open={!!docModal}
        onClose={() => { setDocModal(null); setDocText(''); }}
        title={docModal?.action === 'reject' ? `Reject ${docModal.label}` : `Request info for ${docModal?.label}`}
        size="sm"
      >
        <Textarea
          label={docModal?.action === 'reject' ? 'Reason for rejection' : 'What is missing?'}
          rows={4}
          value={docText}
          onChange={(e) => setDocText(e.target.value)}
          placeholder={docModal?.action === 'reject' ? 'Explain why this document is being rejected...' : 'Describe what is required for this document...'}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setDocModal(null); setDocText(''); }}>Cancel</Button>
          <Button variant={docModal?.action === 'reject' ? 'danger' : 'primary'} onClick={submitDocAction} loading={acting}>
            {docModal?.action === 'reject' ? 'Reject Document' : 'Send Request'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

const CheckRow = ({ done, pending, icon: Icon, label }) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
        done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : pending ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-900 text-slate-500'
      }`}
    >
      <Icon className="h-4 w-4" />
    </span>
    <span className="flex-1 text-sm font-medium text-slate-200">{label}</span>
    <span className={`text-xs font-semibold ${done ? 'text-emerald-400' : pending ? 'text-amber-400' : 'text-slate-500'}`}>
      {done ? '✓' : pending ? '⏳' : '—'}
    </span>
  </div>
);

export default VerificationDetail;
