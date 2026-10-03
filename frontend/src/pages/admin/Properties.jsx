import React, { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getProperties, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const PAGE_SIZE = 10;

const Properties = () => {
  const state = useAsync(getProperties);
  const { data: properties, loading, error, reload } = state;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const filtered = useMemo(() => {
    let list = [...(properties || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          p.customer?.toLowerCase().includes(term) ||
          p.city?.toLowerCase().includes(term) ||
          p.pincode?.includes(term) ||
          p.propertyName?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [properties, debouncedQuery]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = [
    { key: 'name', header: 'Property', render: (p) => p.propertyName },
    { key: 'type', header: 'Type', render: (p) => p.propertyType },
    { key: 'address', header: 'Address', render: (p) => <span className="text-slate-400">{p.address}</span> },
    { key: 'city', header: 'City', render: (p) => p.city, mobileHidden: true },
    { key: 'state', header: 'State', render: (p) => p.state, mobileHidden: true },
    { key: 'pincode', header: 'Pincode', render: (p) => <span className="font-mono text-xs">{p.pincode}</span> },
    { key: 'customer', header: 'Customer', render: (p) => p.customer },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader title="Properties" description="Customer service addresses. Sensitive identity details are not shown." />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search customer, city or pincode..." />
          <DataTable columns={columns} rows={paged} empty={<EmptyState icon={Building2} title="No properties" description="Customer addresses appear here after users register." />} />
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default Properties;
