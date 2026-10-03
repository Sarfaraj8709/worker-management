import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import { Textarea, Select } from '../../components/admin/Input';
import { PageSkeleton } from '../../components/admin/Skeleton';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { ConfirmDialog } from '../../components/admin/Modal';
import { getComplaintDetails, updateComplaint, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import { COMPLAINT_PRIORITY_META, COMPLAINT_STATUS_META, COMPLAINT_STATUSES } from '../../utils/constants';

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getComplaintDetails(id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const act = async (patch, success) => {
    try {
      const updated = await updateComplaint(id, { ...patch, note });
      setData((d) => ({ ...d, ...updated }));
      setNote('');
      toast.success(success);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Complaint" />
        {isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={load} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`CMP-${String(data._id).slice(-5).toUpperCase()}`}
        description={data.category}
        actions={<Button variant="secondary" onClick={() => navigate('/admin/complaints')}><ArrowLeft className="h-4 w-4" /> Back</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={data.status} meta={COMPLAINT_STATUS_META} />
        <StatusBadge status={data.priority} meta={COMPLAINT_PRIORITY_META} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-sm text-slate-300">{data.description || 'No description provided.'}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Customer" value={data.customerId?.name} />
              <Info label="Worker" value={data.workerId?.name} />
              <Info label="Job" value={data.ticketId?.title} />
              <Info label="Payment" value={data.payment?.status || '—'} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-bold text-white">Timeline</h3>
            <ul className="mt-3 space-y-2">
              {(data.timeline || []).length === 0 && <li className="text-sm text-slate-500">No events yet.</li>}
              {(data.timeline || []).map((e, i) => (
                <li key={i} className="text-sm text-slate-300">
                  <span className="font-semibold">{e.event}</span>
                  <span className="ml-2 text-xs text-slate-500">{formatDateTime(e.at)}</span>
                  {e.note && <p className="text-xs text-slate-500">{e.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-3">
          <Select label="Status" value={data.status} onChange={(e) => act({ status: e.target.value, action: 'Status changed' }, 'Status updated')}>
            {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Textarea label="Internal note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for this action" />
          <Button className="w-full" variant="secondary" onClick={() => act({ assignedTo: 'Current admin', action: 'Assigned' }, 'Complaint assigned')}>Assign complaint</Button>
          <Button className="w-full" variant="secondary" onClick={() => act({ status: 'Waiting for Customer', action: 'Requested information' }, 'Information requested')}>Request information</Button>
          <Button className="w-full" variant="secondary" onClick={() => act({ action: 'Refund requested' }, 'Refund flagged — payment processor required to complete')}>Issue refund</Button>
          <Button className="w-full" variant="secondary" onClick={() => act({ action: 'Worker warned' }, 'Worker warned')}>Warn worker</Button>
          <Button className="w-full" variant="danger" onClick={() => setConfirm('suspend')}>Suspend worker</Button>
          <Button className="w-full" onClick={() => act({ status: 'Resolved', action: 'Resolved' }, 'Complaint resolved')}>Resolve</Button>
          <Button className="w-full" variant="ghost" onClick={() => act({ status: 'Rejected', action: 'Rejected' }, 'Complaint rejected')}>Reject</Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm === 'suspend'}
        onClose={() => setConfirm(null)}
        title="Suspend worker"
        danger
        confirmLabel="Suspend"
        message="This will mark the linked worker unavailable. Continue?"
        onConfirm={async () => {
          setConfirm(null);
          toast.info('Worker suspension requires the worker profile id from verification/workers.');
        }}
      />
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="text-sm font-semibold text-slate-200">{value || '—'}</p>
  </div>
);

export default ComplaintDetail;
