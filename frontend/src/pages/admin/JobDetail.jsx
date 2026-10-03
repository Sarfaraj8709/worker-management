import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, User, HardHat, Wallet, Image as ImageIcon } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import Avatar from '../../components/admin/Avatar';
import { StatusBadge } from '../../components/admin/Badge';
import { Select } from '../../components/admin/Input';
import { PageSkeleton } from '../../components/admin/Skeleton';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import JobTimeline from '../../components/admin/Timeline';
import { getJobDetails, updateJobStatus, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatINR } from '../../utils/format';
import { JOB_STATUS_META, JOB_STATUSES, JOB_OTP_META, SEVERITY_META } from '../../utils/constants';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setJob(await getJobDetails(id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const changeStatus = async (status) => {
    setActing(true);
    try {
      const updated = await updateJobStatus(id, status);
      setJob((j) => ({ ...j, ...updated }));
      toast.success('Job status updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Job details" />
        {isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={load} />}
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title || 'Job details'}
        description={`JOB-${String(job._id).slice(-5).toUpperCase()} • ${job.category || 'Service'}`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/admin/jobs')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={job.status} meta={JOB_STATUS_META} />
              <StatusBadge status={job.severity} meta={SEVERITY_META} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{job.description || 'No description provided.'}</p>
            <div className="mt-4 flex items-start gap-2 text-sm text-slate-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{job.location?.address || '—'} {job.location?.pincode ? `• ${job.location.pincode}` : ''}</span>
            </div>
            {job.images?.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {job.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-slate-800">
                    <img src={src} alt="Job attachment" className="h-28 w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
            {(!job.images || job.images.length === 0) && (
              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <ImageIcon className="h-4 w-4" /> No photos attached
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="mb-4 text-sm font-bold text-white">Job timeline</h3>
            <JobTimeline status={job.status} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-bold text-white">People</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={job.userId?.name} size="sm" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</p>
                  <p className="text-sm font-semibold text-slate-200">{job.userId?.name || '—'}</p>
                </div>
                <User className="ml-auto h-4 w-4 text-slate-600" />
              </div>
              <div className="flex items-center gap-3">
                <Avatar name={job.workerId?.name} size="sm" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Worker</p>
                  <p className="text-sm font-semibold text-slate-200">{job.workerId?.name || 'Unassigned'}</p>
                </div>
                <HardHat className="ml-auto h-4 w-4 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-bold text-white">Payment</h3>
            <p className="mt-2 font-mono text-lg font-bold text-slate-100">{job.payment?.amount ? formatINR(job.payment.amount) : job.amount ? formatINR(job.amount) : '—'}</p>
            <p className="text-xs text-slate-500">{job.payment?.status || 'No payment recorded'}</p>
            {job.payment?._id && (
              <Link to={`/admin/payments/${job.payment._id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400">
                <Wallet className="h-3.5 w-3.5" /> View transaction
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white">Job Start OTP</h3>
              <StatusBadge status={job.jobOtp?.status || 'not_generated'} meta={JOB_OTP_META} />
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              {job.jobOtp?.status === 'pending' && job.jobOtp?.expiresAt ? (
                <p>Expires {formatDateTime(job.jobOtp.expiresAt)}</p>
              ) : job.jobOtp?.status === 'verified' && job.jobOtp?.verifiedAt ? (
                <p>Verified {formatDateTime(job.jobOtp.verifiedAt)}</p>
              ) : job.jobOtp?.status === 'expired' ? (
                <p>Locked / expired — customer must generate a new code.</p>
              ) : (
                <p>Worker cannot start the job until the customer generates and shares an OTP.</p>
              )}
              {job.jobOtp?.attempts > 0 && (
                <p className="text-slate-500">
                  {job.jobOtp.attempts} failed attempt{job.jobOtp.attempts === 1 ? '' : 's'} (max 5)
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-bold text-white">Update status</h3>
            <Select value={job.status} onChange={(e) => changeStatus(e.target.value)} disabled={acting} className="mt-3">
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>{JOB_STATUS_META[s]?.label || s}</option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-slate-500">Created {formatDateTime(job.createdAt)}</p>
            {job.complaint && (
              <Link to={`/admin/complaints/${job.complaint._id}`} className="mt-3 block text-xs font-semibold text-rose-400">
                Open complaint on this job →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
