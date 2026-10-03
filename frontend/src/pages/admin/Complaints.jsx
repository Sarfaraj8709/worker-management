import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning, Eye } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { Select } from '../../components/admin/Input';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getComplaints, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { formatDate } from '../../utils/format';
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITY_META, COMPLAINT_STATUS_META, COMPLAINT_STATUSES } from '../../utils/constants';

const PAGE_SIZE = 10;

const Complaints = () => {
  const state = useAsync(getComplaints);
  const { data: complaints, loading, error, reload } = state;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const filtered = useMemo(() => {
    let list = [...(complaints || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (c) =>
          String(c._id).toLowerCase().includes(term) ||
          c.customerId?.name?.toLowerCase().includes(term) ||
          c.category?.toLowerCase().includes(term)
      );
    }
    if (status !== 'all') list = list.filter((c) => c.status === status);
    if (priority !== 'all') list = list.filter((c) => c.priority === priority);
    return list;
  }, [complaints, debouncedQuery, status, priority]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = [
    {
      key: 'id',
      header: 'Complaint ID',
      render: (c) => (
        <Link to={`/admin/complaints/${c._id}`} className="font-mono text-xs font-semibold text-indigo-400">
          CMP-{String(c._id).slice(-5).toUpperCase()}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', render: (c) => c.customerId?.name || '—' },
    { key: 'worker', header: 'Worker', render: (c) => c.workerId?.name || '—', mobileHidden: true },
    { key: 'job', header: 'Job', render: (c) => c.ticketId?.title || '—', mobileHidden: true },
    { key: 'category', header: 'Category', render: (c) => c.category },
    { key: 'priority', header: 'Priority', render: (c) => <StatusBadge status={c.priority} meta={COMPLAINT_PRIORITY_META} /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} meta={COMPLAINT_STATUS_META} /> },
    { key: 'created', header: 'Created', render: (c) => <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>, mobileHidden: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <Link to={`/admin/complaints/${c._id}`}>
          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
        </Link>
      ),
    },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader title="Complaints" description="Investigate disputes between customers and workers." />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search complaints..." className="lg:col-span-2" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">Any Priority</option>
              {Object.keys(COMPLAINT_PRIORITY_META).map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <DataTable
            columns={columns}
            rows={paged}
            empty={<EmptyState icon={MessageSquareWarning} title="No complaints" description="Open disputes will appear here when customers file them." />}
          />
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default Complaints;
