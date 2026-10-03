import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import { PageSkeleton } from '../../components/admin/Skeleton';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getPaymentDetails, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import { formatINR, formatDateTime } from '../../utils/format';
import { PAYMENT_STATUS_META } from '../../utils/constants';

const PaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setPayment(await getPaymentDetails(id));
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payment details" />
        {isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`TXN-${String(payment._id).slice(-6).toUpperCase()}`}
        description="Transaction information"
        actions={<Button variant="secondary" onClick={() => navigate('/admin/payments')}><ArrowLeft className="h-4 w-4" /> Back</Button>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Info label="Amount" value={formatINR(payment.amount)} />
        <Info label="Status" value={<StatusBadge status={payment.status} meta={PAYMENT_STATUS_META} />} />
        <Info label="Method" value={payment.method || '—'} />
        <Info label="Date" value={formatDateTime(payment.createdAt)} />
        <Info label="Customer" value={payment.customerId?.name || '—'} />
        <Info label="Worker" value={payment.workerId?.name || '—'} />
      </div>
      {payment.ticketId && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Associated job</p>
          <p className="mt-1 text-sm font-semibold text-white">{payment.ticketId.title}</p>
          <p className="text-xs text-slate-500">{payment.ticketId.category} • {payment.ticketId.status}</p>
          <Link to={`/admin/jobs/${payment.ticketId._id}`} className="mt-2 inline-block text-xs font-semibold text-indigo-400">Open job →</Link>
        </div>
      )}
    </div>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
  </div>
);

export default PaymentDetail;
