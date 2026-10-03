import React, { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getAuditLogs, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { formatDateTime } from '../../utils/format';

const PAGE_SIZE = 15;

const AuditLog = () => {
  const state = useAsync(getAuditLogs);
  const { data: logs, loading, error, reload } = state;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const filtered = useMemo(() => {
    let list = [...(logs || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (l) =>
          l.admin?.toLowerCase().includes(term) ||
          l.action?.toLowerCase().includes(term) ||
          l.entity?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [logs, debouncedQuery]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = [
    { key: 'admin', header: 'Admin', render: (l) => l.admin || '—' },
    { key: 'action', header: 'Action', render: (l) => l.action },
    { key: 'entity', header: 'Entity', render: (l) => `${l.entityType || ''} ${l.entity || ''}`.trim() || '—' },
    { key: 'prev', header: 'Previous', render: (l) => <span className="text-xs text-slate-500">{l.previousValue || '—'}</span>, mobileHidden: true },
    { key: 'next', header: 'New', render: (l) => <span className="text-xs text-slate-300">{l.newValue || '—'}</span>, mobileHidden: true },
    { key: 'time', header: 'Timestamp', render: (l) => <span className="text-xs text-slate-400">{formatDateTime(l.timestamp || l.createdAt)}</span> },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Administrative actions across the platform." />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search admin, action or entity..." />
          <DataTable columns={columns} rows={paged} empty={<EmptyState icon={ScrollText} title="No audit events yet" description="Approvals, suspensions and setting changes will be recorded here." />} />
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AuditLog;
