import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardHat, UserPlus, Pencil, Trash2, Eye, Ban, CheckCircle2, Award, Wallet, ShieldCheck, ClipboardList, Star, ShieldX, Clock3, Phone, Mail, MapPin, FileText, Car, BadgeCheck, Camera } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import Button from '../../components/admin/Button';
import Avatar from '../../components/admin/Avatar';
import { StatusBadge } from '../../components/admin/Badge';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { Select, Input } from '../../components/admin/Input';
import RatingStars from '../../components/admin/RatingStars';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import Modal, { ConfirmDialog } from '../../components/admin/Modal';
import StatCard from '../../components/admin/StatCard';
import VerificationCard from '../../components/admin/VerificationCard';
import {
  getWorkers,
  updateWorker,
  deleteWorker,
  isMissingEndpoint,
  getErrorMessage,
  getAdminMetrics,
} from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { formatNumber, formatINRCompact, formatDate, maskNumber } from '../../utils/format';
import { SERVICE_OPTIONS, OVERALL_VERIFICATION_META, VERIFICATION_LIST_STATUSES } from '../../utils/constants';

const PAGE_SIZE = 10;

const AVAILABILITY_META = {
  available: { label: 'Available', tone: 'success' },
  busy: { label: 'Busy', tone: 'warning' },
  offline: { label: 'Offline', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
  pending: { label: 'Pending', tone: 'info' },
};

const VERIFICATION_META = {
  Approved: { label: 'Verified', tone: 'success' },
  Pending: { label: 'Pending', tone: 'warning' },
  'Under Review': { label: 'Under Review', tone: 'info' },
  Rejected: { label: 'Rejected', tone: 'danger' },
};


const Workers = () => {
  const { toast } = useToast();
  const workersState = useAsync(getWorkers);
  const metricsState = useAsync(getAdminMetrics);
  const { data: workers, loading, error, reload } = workersState;
  const { data: metrics } = metricsState;

  const [query, setQuery] = useState('');
  const [service, setService] = useState('all');
  const [rating, setRating] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [verification, setVerification] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [editWorker, setEditWorker] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [acting, setActing] = useState(false);

  const verificationSummary = metrics?.verificationSummary || {};

  const getOverallStatus = (w) => w.verification?.overallStatus || 'Not Verified';

  const workerStatus = (w) => {
    if (w.suspended) return 'suspended';
    if (!w.isAvailable) return 'busy';
    return 'available';
  };

  const filtered = useMemo(() => {
    let list = [...(workers || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (w) =>
          w.userId?.name?.toLowerCase().includes(term) ||
          w.userId?.email?.toLowerCase().includes(term) ||
          w.userId?.phone?.toLowerCase().includes(term) ||
          w.serviceArea?.toLowerCase().includes(term)
      );
    }
    if (service !== 'all') list = list.filter((w) => (w.skills || []).includes(service));
    if (rating !== 'all') {
      const min = Number(rating);
      list = list.filter((w) => (w.rating ?? 0) >= min);
    }
    if (availability !== 'all') {
      list = list.filter((w) => workerStatus(w) === availability);
    }
    if (verification !== 'all') {
      list = list.filter((w) => {
        const current = getOverallStatus(w);
        if (verification === 'none') return !current || current === 'Not Verified';
        return current === verification;
      });
    }
    return list;
  }, [workers, debouncedQuery, service, rating, availability, verification]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, service, rating, availability, verification]);

  const toggleSuspend = async (w) => {
    setActing(true);
    try {
      const nextSuspended = !w.suspended;
      await updateWorker(w._id, { isAvailable: !nextSuspended && w.isAvailable });
      if (nextSuspended) {
        await updateWorker(w._id, { isAvailable: false });
      }
      toast.success(nextSuspended ? 'Worker suspended' : 'Worker activated');
      await reload();
      setSelected((s) => (s?._id === w._id ? { ...s, suspended: nextSuspended } : s));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await deleteWorker(confirmDelete._id);
      setConfirmDelete(null);
      await reload();
      toast.success('Worker deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const openDetail = (w) => {
    setSelected(w);
    setDetailTab('overview');
  };

  const columns = [
    {
      key: 'name',
      header: 'Worker',
      render: (w) => (
        <div className="flex items-center gap-3">
          <Avatar name={w.userId?.name} size="sm" />
          <div>
            <p className="font-semibold text-slate-100">{w.userId?.name}</p>
            <p className="font-mono text-[11px] text-slate-500">WM-{String(w._id).slice(-5)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'skills',
      header: 'Specialization',
      render: (w) => (
        <div className="flex max-w-[220px] flex-wrap gap-1">
          {(w.skills || []).slice(0, 2).map((s) => (
            <span key={s} className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">{s}</span>
          ))}
          {(w.skills || []).length > 2 && (
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">+{(w.skills || []).length - 2}</span>
          )}
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', render: (w) => <RatingStars rating={w.rating ?? 5} size="sm" /> },
    { key: 'jobsCompleted', header: 'Jobs', render: (w) => <span className="font-mono text-xs">{formatNumber(w.jobsCompleted)}</span> },
    {
      key: 'availability',
      header: 'Availability',
      render: (w) => <StatusBadge status={workerStatus(w)} meta={AVAILABILITY_META} />,
    },
    {
      key: 'verification',
      header: 'Verification',
      render: (w) => {
        const overall = getOverallStatus(w);
        const progress = w.verification?.progress;
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge status={overall} meta={OVERALL_VERIFICATION_META} />
            {progress && (
              <span className="text-[10px] text-slate-500 font-mono">{progress.verified}/{progress.total} items</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (w) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openDetail(w)} title="View worker">
            <Eye className="h-4 w-4" />
          </Button>
          <Link to={`/admin/workers/${w._id}`}>
            <Button variant="ghost" size="sm" title="Edit worker">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => toggleSuspend(w)} disabled={acting} title={w.suspended ? 'Activate worker' : 'Suspend worker'}>
            {w.suspended ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Ban className="h-4 w-4 text-amber-400" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(w)} title="Delete worker">
            <Trash2 className="h-4 w-4 text-rose-400" />
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers"
        description="Manage service professionals, their profiles, availability and verification."
        actions={
          <Link to="/admin/workers/new">
            <Button icon={<UserPlus className="h-4 w-4" />}>Add Worker</Button>
          </Link>
        }
      />

      {error ? (
        isMissingEndpoint(error) ? (
          <EndpointRequired error={error} />
        ) : (
          <ErrorState message={getErrorMessage(error)} onRetry={reload} />
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Total Workers" value={formatNumber(verificationSummary.total || workers?.length || 0)} icon={HardHat} />
            <StatCard label="Fully Verified" value={formatNumber(verificationSummary.fullyVerified || 0)} icon={ShieldIcon} iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
            <StatCard label="Pending Review" value={formatNumber(verificationSummary.pendingReview || 0)} icon={Clock3} iconClass="bg-sky-500/10 text-sky-400 border-sky-500/20" />
            <StatCard label="Partially Verified" value={formatNumber(verificationSummary.partiallyVerified || 0)} icon={ShieldCheck} iconClass="bg-amber-500/10 text-amber-400 border-amber-500/20" />
            <StatCard label="Rejected" value={formatNumber(verificationSummary.rejected || 0)} icon={ShieldX} iconClass="bg-rose-500/10 text-rose-400 border-rose-500/20" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <SearchInput value={query} onChange={setQuery} placeholder="Search workers..." className="lg:col-span-1" />
            <Select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="all">All Services</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
            <Select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="all">Any Rating</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
              <option value="5">5</option>
            </Select>
            <Select value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="all">Any Availability</option>
              <option value="available">Available now</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
              <option value="suspended">Suspended</option>
            </Select>
            <Select value={verification} onChange={(e) => setVerification(e.target.value)}>
              <option value="all">Any Verification</option>
              {VERIFICATION_LIST_STATUSES.filter((s) => s.value !== 'all').map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>

          <DataTable
            columns={columns}
            rows={paged}
            empty={
              <EmptyState
                icon={HardHat}
                title="No workers found"
                description={debouncedQuery ? 'Try adjusting your search or filters.' : 'No workers match the current filters.'}
              />
            }
          />

          <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Worker profile" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={selected.userId?.name} size="lg" />
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white">{selected.userId?.name}</h4>
                <p className="text-sm text-slate-400">{selected.userId?.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={workerStatus(selected)} meta={AVAILABILITY_META} />
                  <StatusBadge status={selected.verification?.status || 'Pending'} meta={VERIFICATION_META} />
                  <RatingStars rating={selected.rating ?? 5} />
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/workers/${selected._id}`}>
                  <Button variant="secondary" size="sm"><Pencil className="h-4 w-4" /> Edit</Button>
                </Link>
                <Button variant="danger" size="sm" onClick={() => { setConfirmDelete(selected); setSelected(null); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <Award className="h-4 w-4 text-amber-400" />
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rating</p>
                <p className="text-sm font-bold text-slate-100">{selected.rating ?? 5}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <ClipboardList className="h-4 w-4 text-indigo-400" />
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Jobs</p>
                <p className="text-sm font-bold text-slate-100">{formatNumber(selected.jobsCompleted)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Earnings</p>
                <p className="text-sm font-bold text-slate-100">{selected.earnings ? formatINRCompact(selected.earnings) : '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Area</p>
                <p className="text-sm font-bold text-slate-100">{selected.serviceArea || '—'}</p>
              </div>
            </div>

            <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'jobs', label: 'Jobs', icon: ClipboardList },
                { id: 'earnings', label: 'Earnings', icon: Wallet },
                { id: 'reviews', label: 'Reviews', icon: Star },
                { id: 'verification', label: 'Verification', icon: ShieldCheck },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition sm:text-xs ${
                    detailTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="min-h-[140px] rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-400">
              {detailTab === 'overview' && (
                <div className="space-y-2">
                  <p><span className="text-slate-500">Phone:</span> <span className="font-mono text-slate-200">{selected.userId?.phone}</span></p>
                  <p><span className="text-slate-500">Service area:</span> <span className="text-slate-200">{selected.serviceArea}</span></p>
                  <p><span className="text-slate-500">Skills:</span> <span className="text-slate-200">{(selected.skills || []).join(', ') || '—'}</span></p>
                  <p><span className="text-slate-500">Address:</span> <span className="text-slate-200">{selected.userId?.address?.street}, {selected.userId?.address?.city} {selected.userId?.address?.pincode}</span></p>
                  <p><span className="text-slate-500">Joined:</span> <span className="text-slate-200">{formatDate(selected.userId?.createdAt || selected.createdAt)}</span></p>
                </div>
              )}
              {detailTab === 'jobs' && <p>Worker job history will be shown here. Required endpoint: GET /api/admin/workers/:id.</p>}
              {detailTab === 'earnings' && <p>Worker earnings breakdown will be shown here. Required endpoint: GET /api/admin/workers/:id.</p>}
              {detailTab === 'reviews' && <p>Worker reviews will be shown here. Required endpoint: GET /api/admin/workers/:id.</p>}
              {detailTab === 'verification' && (
                <div className="space-y-4">
                  {(() => {
                    const v = selected.verification || {};
                  const overall = v.overallStatus || 'Not Verified';
                  const progress = v.progress || { total: 7, verified: 0, pct: 0 };
                    return (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Status</p>
                            <div className="mt-1">
                              <StatusBadge status={overall} meta={OVERALL_VERIFICATION_META} />
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Progress</p>
                            <p className="text-sm font-bold text-white">{progress.verified} / {progress.total} items verified</p>
                            <p className="text-xs text-slate-500">{progress.pct}% complete</p>
                          </div>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress.pct}%` }} />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {[
                            { key: 'phone', label: 'Phone', icon: Phone, required: true },
                            { key: 'email', label: 'Email', icon: Mail, required: true },
                            { key: 'identity', label: 'Identity', icon: BadgeCheck, required: true },
                            { key: 'address', label: 'Address', icon: MapPin, required: true },
                            { key: 'drivingLicense', label: 'Driving License', icon: Car, required: false },
                            { key: 'certificates', label: 'Certificates', icon: FileText, required: false },
                            { key: 'profilePhoto', label: 'Profile Photo', icon: Camera, required: true },
                          ].map((doc) => {
                            const docData = v.documentsDetail?.[doc.key] || v[doc.key] || {};
                            const submittedAt = docData.submittedAt ? formatDate(docData.submittedAt) : null;
                            const verifiedAt = docData.verifiedAt ? formatDate(docData.verifiedAt) : null;
                            const value = docData.documentId ? maskNumber(docData.documentId) : null;
                            return (
                              <VerificationCard
                                key={doc.key}
                                docType={doc.key}
                                label={doc.label}
                                icon={doc.icon}
                                value={value}
                                status={docData.status || 'not_submitted'}
                                required={doc.required}
                                verifiedAt={verifiedAt}
                                submittedAt={submittedAt}
                                rejectionReason={docData.rejectionReason}
                                note={docData.note}
                                compact
                              />
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editWorker} onClose={() => setEditWorker(null)} title="Edit worker" size="lg">
        {editWorker && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name" value={editWorker.name} onChange={(e) => setEditWorker({ ...editWorker, name: e.target.value })} />
              <Input label="Phone" value={editWorker.phone} onChange={(e) => setEditWorker({ ...editWorker, phone: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditWorker(null)}>Cancel</Button>
              <Button>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete worker"
        confirmLabel="Delete"
        danger
        loading={acting}
        message={`Delete ${confirmDelete?.userId?.name}? Their active jobs will be reset and their account removed permanently.`}
      />
    </div>
  );
};

export default Workers;
