import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, Clock3, FileSearch, Eye } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import Button from '../../components/admin/Button';
import Avatar from '../../components/admin/Avatar';
import { StatusBadge } from '../../components/admin/Badge';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { Select } from '../../components/admin/Input';
import StatCard from '../../components/admin/StatCard';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getVerifications, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { formatDate } from '../../utils/format';
import { VERIFICATION_STATUS_META } from '../../utils/constants';

const PAGE_SIZE = 10;

const RISK_META = {
  Low: { label: 'Low', tone: 'success' },
  Medium: { label: 'Medium', tone: 'warning' },
  High: { label: 'High', tone: 'danger' },
};

const statusOf = (v) => v.status || v.verification?.status || 'Pending';

const Verification = () => {
  const state = useAsync(getVerifications);
  const { data: items, loading, error, reload } = state;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const counts = useMemo(() => {
    const list = items || [];
    return {
      pending: list.filter((v) => statusOf(v) === 'Pending').length,
      approved: list.filter((v) => statusOf(v) === 'Approved').length,
      rejected: list.filter((v) => statusOf(v) === 'Rejected').length,
      underReview: list.filter((v) => statusOf(v) === 'Under Review').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...(items || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) list = list.filter((v) => v.userId?.name?.toLowerCase().includes(term) || v.userId?.email?.toLowerCase().includes(term));
    if (status !== 'all') list = list.filter((v) => statusOf(v) === status);
    return list;
  }, [items, debouncedQuery, status]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status]);

  const columns = [
    {
      key: 'name',
      header: 'Worker',
      render: (v) => (
        <div className="flex items-center gap-3">
          <Avatar name={v.userId?.name} size="sm" />
          <div>
            <p className="font-semibold text-slate-100">{v.userId?.name}</p>
            <p className="text-[11px] text-slate-500">{v.userId?.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'submittedAt', header: 'Submitted', render: (v) => <span className="text-xs text-slate-400">{formatDate(v.submittedAt || v.createdAt)}</span> },
    {
      key: 'documents',
      header: 'Documents',
      render: (v) => {
        const list = v.documents || v.verification?.documents || [];
        return (
          <span className="text-xs text-slate-400">
            {list.filter((d) => d.status === 'verified').length} / {list.length || 0} verified
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={statusOf(v)} meta={VERIFICATION_STATUS_META} />,
    },
    {
      key: 'risk',
      header: 'Risk',
      render: (v) => <StatusBadge status={v.risk || 'Low'} meta={RISK_META} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v) => (
        <Link to={`/admin/verification/${v._id}`}>
          <Button variant="secondary" size="sm">
            <Eye className="h-4 w-4" /> Review
          </Button>
        </Link>
      ),
      className: 'text-right',
    },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Worker Verification"
        description="Review identity documents and approve trusted professionals."
      />

      {error ? (
        isMissingEndpoint(error) ? (
          <EndpointRequired error={error} hint="Implement GET /api/admin/verifications to power this page." />
        ) : (
          <ErrorState message={getErrorMessage(error)} onRetry={reload} />
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Pending" value={counts.pending} icon={Clock3} iconClass="bg-amber-500/10 text-amber-400 border-amber-500/20" />
            <StatCard label="Approved" value={counts.approved} icon={ShieldCheck} iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
            <StatCard label="Rejected" value={counts.rejected} icon={ShieldX} iconClass="bg-rose-500/10 text-rose-400 border-rose-500/20" />
            <StatCard label="Under Review" value={counts.underReview} icon={FileSearch} iconClass="bg-sky-500/10 text-sky-400 border-sky-500/20" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by worker name or email..." />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-48">
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </Select>
          </div>

          <DataTable
            columns={columns}
            rows={paged}
            empty={
              <EmptyState
                icon={ShieldCheck}
                title="No verification requests"
                description="All workers have been reviewed."
                action={
                  <Link to="/admin/workers">
                    <Button variant="secondary">View Workers</Button>
                  </Link>
                }
              />
            }
          />

          <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default Verification;
