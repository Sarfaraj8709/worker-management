import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Eye } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { Select } from '../../components/admin/Input';
import StatCard from '../../components/admin/StatCard';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getPayments, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { formatINR, formatINRCompact, formatDate } from '../../utils/format';
import { PAYMENT_STATUS_META } from '../../utils/constants';

const PAGE_SIZE = 10;

const Payments = () => {
  const state = useAsync(getPayments);
  const { data: payments, loading, error, reload } = state;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const totals = payments?.totals || null;
  const computed = useMemo(() => {
    const list = payments || [];
    return {
      total: list.reduce((s, p) => s + (p.amount || 0), 0),
      successful: list.filter((p) => p.status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0),
      pending: list.filter((p) => p.status === 'Pending').reduce((s, p) => s + (p.amount || 0), 0),
      refunded: list.filter((p) => p.status === 'Refunded').reduce((s, p) => s + (p.amount || 0), 0),
    };
  }, [payments]);

  const stats = totals || computed;

  const filtered = useMemo(() => {
    let list = [...(payments || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          String(p._id).toLowerCase().includes(term) ||
          p.customerId?.name?.toLowerCase().includes(term) ||
          p.workerId?.name?.toLowerCase().includes(term)
      );
    }
    if (status !== 'all') list = list.filter((p) => p.status === status);
    return list;
  }, [payments, debouncedQuery, status]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const columns = [
    {
      key: 'id',
      header: 'Transaction ID',
      render: (p) => (
        <Link to={`/admin/payments/${p._id}`} className="font-mono text-xs font-semibold text-indigo-400">
          TXN-{String(p._id).slice(-6).toUpperCase()}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', render: (p) => p.customerId?.name || '—' },
    { key: 'worker', header: 'Worker', render: (p) => p.workerId?.name || '—', mobileHidden: true },
    { key: 'job', header: 'Job', render: (p) => p.ticketId?.title || '—', mobileHidden: true },
    { key: 'amount', header: 'Amount', render: (p) => <span className="font-mono text-xs">{formatINR(p.amount)}</span> },
    { key: 'method', header: 'Method', render: (p) => p.method || '—', mobileHidden: true },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} meta={PAYMENT_STATUS_META} /> },
    { key: 'date', header: 'Date', render: (p) => <span className="text-xs text-slate-400">{formatDate(p.createdAt)}</span>, mobileHidden: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <Link to={`/admin/payments/${p._id}`}>
          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
        </Link>
      ),
    },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Platform transactions. Empty until a payment processor records jobs." />

      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Revenue" value={formatINRCompact(stats.total)} icon={CreditCard} />
            <StatCard label="Successful" value={formatINRCompact(stats.successful)} iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
            <StatCard label="Pending" value={formatINRCompact(stats.pending)} iconClass="bg-amber-500/10 text-amber-400 border-amber-500/20" />
            <StatCard label="Refunded" value={formatINRCompact(stats.refunded)} iconClass="bg-slate-500/10 text-slate-300 border-slate-500/20" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search transaction, customer, worker..." />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-40">
              <option value="all">All Status</option>
              {Object.keys(PAYMENT_STATUS_META).map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <DataTable
            columns={columns}
            rows={paged}
            empty={<EmptyState icon={CreditCard} title="No payments yet" description="Payments will appear here when transactions are recorded against completed jobs." />}
          />
          <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default Payments;
