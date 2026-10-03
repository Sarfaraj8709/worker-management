import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, Trash2, Ban, CheckCircle2, Award, Wallet, ClipboardList, ShieldCheck, Star, Phone, Mail, MapPin, XCircle, BadgeCheck, Car, Camera, FileText } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import Avatar from '../../components/admin/Avatar';
import Badge, { StatusBadge } from '../../components/admin/Badge';
import RatingStars from '../../components/admin/RatingStars';
import { Input, Select, Textarea } from '../../components/admin/Input';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import Modal, { ConfirmDialog } from '../../components/admin/Modal';
import VerificationCard from '../../components/admin/VerificationCard';
import {
  getWorkerById,
  updateWorker,
  deleteWorker,
  isMissingEndpoint,
  getErrorMessage,
  approveVerificationDocument,
  rejectVerificationDocument,
  requestVerificationDocumentInfo,
  approveVerification,
  rejectVerification,
} from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatNumber, formatINRCompact, maskNumber } from '../../utils/format';
import { SERVICE_OPTIONS, OVERALL_VERIFICATION_META, VERIFICATION_DOC_TYPES } from '../../utils/constants';

const AVAILABILITY_META = {
  available: { label: 'Available', tone: 'success' },
  busy: { label: 'Busy', tone: 'warning' },
  offline: { label: 'Offline', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
  pending: { label: 'Pending', tone: 'info' },
};

const DOC_ICONS = {
  phone: Phone,
  email: Mail,
  identity: BadgeCheck,
  address: MapPin,
  drivingLicense: Car,
  certificates: FileText,
  profilePhoto: Camera,
};

const WorkerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [rejectDoc, setRejectDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoDoc, setInfoDoc] = useState(null);
  const [infoNote, setInfoNote] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkerById(id);
      setWorker(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const workerStatus = (w) => (w?.suspended ? 'suspended' : !w?.isAvailable ? 'busy' : 'available');

  const startEdit = () => {
    setDraft({
      name: worker.userId?.name || '',
      email: worker.userId?.email || '',
      phone: worker.userId?.phone || '',
      skills: worker.skills || [],
      serviceArea: worker.serviceArea || '',
      rating: worker.rating ?? 5,
      isAvailable: !!worker.isAvailable,
      jobsCompleted: worker.jobsCompleted || 0,
      street: worker.userId?.address?.street || '',
      city: worker.userId?.address?.city || '',
      state: worker.userId?.address?.state || '',
      pincode: worker.userId?.address?.pincode || worker.serviceArea || '',
    });
    setEditing(true);
  };

  const toggleSkill = (skill) =>
    setDraft((d) => ({ ...d, skills: d.skills.includes(skill) ? d.skills.filter((s) => s !== skill) : [...d.skills, skill] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateWorker(worker._id, {
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        skills: draft.skills,
        serviceArea: draft.serviceArea,
        rating: Number(draft.rating),
        isAvailable: draft.isAvailable,
        jobsCompleted: Number(draft.jobsCompleted),
        address: { street: draft.street, city: draft.city, state: draft.state, pincode: draft.pincode },
      });
      setWorker({ ...worker, ...updated });
      setEditing(false);
      toast.success('Worker updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspend = async () => {
    setSaving(true);
    try {
      await updateWorker(worker._id, { isAvailable: false });
      await updateWorker(worker._id, { isAvailable: suspended });
      setWorker((w) => ({ ...w, suspended: !suspended }));
      toast.success(suspended ? 'Worker suspended' : 'Worker activated');
      setSuspended(!suspended);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteWorker(worker._id);
      toast.success('Worker deleted');
      navigate('/admin/workers');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleApproveDoc = async (docType) => {
    setActing(true);
    try {
      await approveVerificationDocument(id, docType);
      toast.success(`${docType.replace(/([A-Z])/g, ' $1')} verified`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleRejectDoc = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setActing(true);
    try {
      await rejectVerificationDocument(id, rejectDoc, rejectReason.trim());
      setRejectDoc(null);
      setRejectReason('');
      toast.success('Document rejected');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!infoNote.trim()) {
      toast.error('Please describe what information is required');
      return;
    }
    setActing(true);
    try {
      await requestVerificationDocumentInfo(id, infoDoc, infoNote.trim());
      setInfoDoc(null);
      setInfoNote('');
      toast.success('Request sent to worker');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleApproveAll = async () => {
    setActing(true);
    try {
      await approveVerification(id);
      toast.success('Worker fully verified');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleRejectAll = async () => {
    setActing(true);
    try {
      await rejectVerification(id, rejectReason || 'Verification rejected by admin');
      toast.success('Worker verification rejected');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return isMissingEndpoint(error) ? (
      <div className="space-y-6">
        <PageHeader title="Worker details" />
        <EndpointRequired error={error} />
      </div>
    ) : (
      <div className="space-y-6">
        <PageHeader title="Worker details" />
        <ErrorState message={getErrorMessage(error)} onRetry={load} />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="space-y-6">
        <PageHeader title="Worker details" />
        <EmptyState icon={Ban} title="Worker not found" description="This worker may have been removed." />
      </div>
    );
  }

  const u = worker.userId || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Worker details"
        description={u.email || `WM-${String(worker._id).slice(-5)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/admin/workers')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {!editing && (
              <>
                <Button variant="secondary" onClick={startEdit}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant={workerStatus(worker) === 'suspended' ? 'success' : 'danger'} onClick={toggleSuspend} loading={saving}>
                  {workerStatus(worker) === 'suspended' ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  {workerStatus(worker) === 'suspended' ? 'Activate' : 'Suspend'}
                </Button>
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Profile header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={u.name} size="lg" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white">{u.name}</h2>
                <StatusBadge status={workerStatus(worker)} meta={AVAILABILITY_META} />
                <StatusBadge status={worker.verification?.overallStatus || worker.verification?.status || 'Pending'} meta={OVERALL_VERIFICATION_META} />
              </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{u.email}</span>
              <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{u.phone || '—'}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{worker.serviceArea || '—'}</span>
            </div>
          </div>
          <RatingStars rating={worker.rating ?? 5} size="lg" />
        </div>
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input label="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <Input label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <Select label="Service Area" value={draft.serviceArea} onChange={(e) => setDraft({ ...draft, serviceArea: e.target.value })}>
              <option value="">Select pincode/city</option>
              {['400001', '400002', '400003', '400004', '400005', '400006'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <Input label="Rating" type="number" min="1" max="5" step="0.1" value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })} />
            <Input label="Jobs Completed" type="number" min="0" value={draft.jobsCompleted} onChange={(e) => setDraft({ ...draft, jobsCompleted: e.target.value })} />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Skills / Services</p>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSkill(s.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    draft.skills.includes(s.value)
                      ? 'border-indigo-500/50 bg-indigo-600 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Street" value={draft.street} onChange={(e) => setDraft({ ...draft, street: e.target.value })} />
            <Input label="City" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            <Input label="State" value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <Award className="h-5 w-5 text-amber-400" />
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Rating</p>
              <p className="text-2xl font-bold text-white">{worker.rating ?? 5}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <ClipboardList className="h-5 w-5 text-indigo-400" />
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Jobs</p>
              <p className="text-2xl font-bold text-white">{formatNumber(worker.jobsCompleted)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <Wallet className="h-5 w-5 text-emerald-400" />
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Earnings</p>
              <p className="text-2xl font-bold text-white">{worker.earnings ? formatINRCompact(worker.earnings) : '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <ShieldCheck className="h-5 w-5 text-sky-400" />
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Joined</p>
              <p className="text-xl font-bold text-white">{formatDate(u.createdAt || worker.createdAt)}</p>
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-bold text-white">Specializations</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(worker.skills || []).map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
              {worker.skills?.length === 0 && <span className="text-sm text-slate-500">No skills set.</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 sm:grid-cols-4">
            {[
              { id: 'jobs', label: 'Jobs', icon: ClipboardList },
              { id: 'earnings', label: 'Earnings', icon: Wallet },
              { id: 'reviews', label: 'Reviews', icon: Star },
              { id: 'verification', label: 'Verification', icon: ShieldCheck },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-400">
            {tab === 'jobs' && (
              (worker.jobs || []).length ? (
                <ul className="divide-y divide-slate-800">
                  {worker.jobs.map((job) => (
                    <li key={job._id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-semibold text-slate-200">{job.title}</p>
                        <p className="text-xs text-slate-500">{job.status} • {formatDate(job.createdAt)}</p>
                      </div>
                      <Link to={`/admin/jobs/${job._id}`} className="text-xs font-semibold text-indigo-400">View →</Link>
                    </li>
                  ))}
                </ul>
              ) : <WorkerSubList icon={ClipboardList} text="No jobs assigned to this worker yet." />
            )}
            {tab === 'earnings' && (
              (worker.payments || []).length ? (
                <ul className="divide-y divide-slate-800">
                  {worker.payments.map((p) => (
                    <li key={p._id} className="flex items-center justify-between py-2.5">
                      <span>{p.status}</span>
                      <span className="font-mono text-slate-200">{formatINRCompact(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <WorkerSubList icon={Wallet} text="No recorded payouts yet. Payments appear when transactions are stored." />
            )}
            {tab === 'reviews' && (
              (worker.reviews || []).length ? (
                <ul className="divide-y divide-slate-800">
                  {worker.reviews.map((r) => (
                    <li key={r._id} className="py-2.5">
                      <p className="font-semibold text-slate-200">{r.rating}★</p>
                      <p className="text-sm text-slate-400">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              ) : <WorkerSubList icon={Star} text="No reviews yet." />
            )}
            {tab === 'verification' && (
              <div className="space-y-4">
                {(() => {
                  const v = worker.verification || {};
                  const overall = v.overallStatus || 'Not Verified';
                  const progress = v.progress || { total: 7, verified: 0, pct: 0 };
                  const timeline = v.timeline || [];
                  return (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Worker Verification</p>
                          <p className="text-lg font-bold text-white mt-1">{u.name}</p>
                          <p className="text-xs text-slate-500 font-mono">Worker ID: WM-{String(worker._id).slice(-5)}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Status</p>
                          <div className="mt-1">
                            <StatusBadge status={overall} meta={OVERALL_VERIFICATION_META} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Verification Progress</span>
                        <span className="font-mono text-slate-200">{progress.verified} / {progress.total} items verified</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress.pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-500">{progress.pct}% Complete</p>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {VERIFICATION_DOC_TYPES.map((doc) => {
                          const docData = v.documentsDetail?.[doc.key] || v[doc.key] || {};
                          const submittedAt = docData.submittedAt ? formatDate(docData.submittedAt) : null;
                          const verifiedAt = docData.verifiedAt ? formatDate(docData.verifiedAt) : null;
                          const value = docData.documentId ? maskNumber(docData.documentId) : null;
                          const Icon = DOC_ICONS[doc.key] || FileText;
                          return (
                            <VerificationCard
                              key={doc.key}
                              docType={doc.key}
                              label={doc.label}
                              icon={Icon}
                              value={value}
                              status={docData.status || 'not_submitted'}
                              required={doc.required}
                              verifiedAt={verifiedAt}
                              submittedAt={submittedAt}
                              rejectionReason={docData.rejectionReason}
                              note={docData.note}
                              onApprove={() => handleApproveDoc(doc.key)}
                              onReject={() => { setRejectDoc(doc.key); setRejectReason(''); }}
                              onRequestInfo={() => { setInfoDoc(doc.key); setInfoNote(''); }}
                            />
                          );
                        })}
                      </div>

                      {timeline.length > 0 && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                          <h3 className="text-sm font-bold text-white mb-4">Verification History</h3>
                          <ol className="relative space-y-4">
                            {timeline.map((event, i) => (
                              <li key={i} className="flex gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-bold">
                                  {i + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-200">{event.event}</p>
                                  {event.note && <p className="text-xs text-slate-500">{event.note}</p>}
                                  <p className="text-xs text-slate-600">{formatDate(event.at)}</p>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleApproveAll} loading={acting} disabled={overall === 'Fully Verified'}>
                          <CheckCircle2 className="h-4 w-4" /> Approve All
                        </Button>
                        <Button variant="danger" onClick={() => { setRejectDoc('all'); setRejectReason(''); }} loading={acting}>
                          <XCircle className="h-4 w-4" /> Reject All
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </>
      )}

      {/* Reject document modal */}
      <Modal open={!!rejectDoc} onClose={() => { setRejectDoc(null); setRejectReason(''); }} title={`Reject ${rejectDoc && rejectDoc !== 'all' ? rejectDoc.replace(/([A-Z])/g, ' $1') : 'Worker Verification'}`} size="sm">
        <Textarea
          label="Reason for rejection"
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Explain why this document was rejected..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setRejectDoc(null); setRejectReason(''); }}>Cancel</Button>
          <Button variant="danger" onClick={rejectDoc === 'all' ? handleRejectAll : handleRejectDoc} loading={acting}>Reject</Button>
        </div>
      </Modal>

      {/* Request info modal */}
      <Modal open={!!infoDoc} onClose={() => { setInfoDoc(null); setInfoNote(''); }} title="Request Additional Information" size="sm">
        <p className="text-sm text-slate-400 mb-3">Document: <span className="font-semibold text-slate-200">{infoDoc?.replace(/([A-Z])/g, ' $1')}</span></p>
        <Textarea
          label="Message"
          rows={4}
          value={infoNote}
          onChange={(e) => setInfoNote(e.target.value)}
          placeholder="Describe what documents or information are required..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setInfoDoc(null); setInfoNote(''); }}>Cancel</Button>
          <Button onClick={handleRequestInfo} loading={acting}>Send Request</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete worker"
        confirmLabel="Delete"
        danger
        loading={saving}
        message={`Delete ${u.name}? This will permanently remove the account and reset their active jobs.`}
      />
    </div>
  );
};

const WorkerSubList = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-2 py-6">
    <Icon className="h-4 w-4 text-slate-500" /> {text}
  </p>
);

export default WorkerDetail;
