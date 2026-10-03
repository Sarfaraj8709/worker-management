import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import Button from '../../components/admin/Button';
import Avatar from '../../components/admin/Avatar';
import { StatusBadge } from '../../components/admin/Badge';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { Select } from '../../components/admin/Input';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getJobs, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { formatINR, formatDate, formatNumber } from '../../utils/format';
import { JOB_STATUS_META, SEVERITY_META, SERVICE_OPTIONS, JOB_STATUSES } from '../../utils/constants';

const PAGE_SIZE = 10;

const Jobs = () => {
  const state = useAsync(getJobs);
  const { data: jobs, loading, error, reload } = state;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const filtered = useMemo(() => {
    let list = [...(jobs || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (j) =>
          j.title?.toLowerCase().includes(term) ||
          j.userId?.name?.toLowerCase().includes(term) ||
          j.workerId?.name?.toLowerCase().includes(term) ||
          String(j._id).toLowerCase().includes(term) ||
          j.location?.pincode?.includes(term)
      );
    }
    if (status !== 'all') list = list.filter((j) => j.status === status);
    if (category !== 'all') list = list.filter((j) => j.category === category);
    if (severity !== 'all') list = list.filter((j) => j.severity === severity);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [jobs, debouncedQuery, status, category, severity]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, category, severity]);

  const columns = [
    {
      key: 'id',
      header: 'Job ID',
      render: (j) => (
        <Link to={`/admin/jobs/${j._id}`} className="font-mono text-xs font-semibold text-indigo-400 hover:text-indigo-300">
          JOB-{String(j._id).slice(-5).toUpperCase()}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Job',
      render: (j) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate font-semibold text-slate-100">{j.title}</p>
          <p className="text-[11px] text-slate-500">{j.category}</p>
        </div>
      ),
    },
    { key: 'customer', header: 'Customer', render: (j) => <span className="text-slate-300">{j.userId?.name || '—'}</span> },
    { key: 'worker', header: 'Worker', render: (j) => <span className="text-slate-300">{j.workerId?.name || '—'}</span> },
    { key: 'location', header: 'Location', render: (j) => <span className="text-xs text-slate-400">{j.location?.pincode || '—'}</span>, mobileHidden: true },
    { key: 'amount', header: 'Amount', render: (j) => <span className="font-mono text-xs text-slate-200">{j.amount ? formatINR(j.amount) : '—'}</span>, mobileHidden: true },
    { key: 'severity', header: 'Priority', render: (j) => <StatusBadge status={j.severity} meta={SEVERITY_META} />, mobileHidden: true },
    { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} meta={JOB_STATUS_META} /> },
    { key: 'createdAt', header: 'Created', render: (j) => <span className="text-xs text-slate-400">{formatDate(j.createdAt)}</span>, mobileHidden: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (j) => (
        <Link to={`/admin/jobs/${j._id}`}>
          <Button variant="ghost" size="sm" title="View job">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
      className: 'text-right',
    },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description={`All platform service requests (${formatNumber(jobs?.length || 0)}).`} />

      {error ? (
        isMissingEndpoint(error) ? (
          <EndpointRequired error={error} hint="Implement GET /api/admin/jobs to power this page." />
        ) : (
          <ErrorState message={getErrorMessage(error)} onRetry={reload} />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <SearchInput value={query} onChange={setQuery} placeholder="Search job, customer, worker, pincode..." className="lg:col-span-2" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>{JOB_STATUS_META[s]?.label || s}</option>
              ))}
            </Select>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All Services</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="all">Any Priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Emergency">Emergency</option>
            </Select>
          </div>

          <DataTable
            columns={columns}
            rows={paged}
            empty={
              <EmptyState
                icon={ClipboardList}
                title="No jobs found"
                description={debouncedQuery ? 'Try adjusting your search or filters.' : 'No service requests match the current filters.'}
              />
            }
          />

          <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default Jobs;
