import React, { useMemo, useState } from 'react';
import { Star, EyeOff, Flag, Trash2, Check } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import RatingStars from '../../components/admin/RatingStars';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { ConfirmDialog } from '../../components/admin/Modal';
import { getReviews, moderateReview, deleteReview, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/format';
import { REVIEW_STATUS_META } from '../../utils/constants';

const PAGE_SIZE = 10;

const Reviews = () => {
  const { toast } = useToast();
  const state = useAsync(getReviews);
  const { data: reviews, loading, error, reload } = state;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const distribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    (reviews || []).forEach((r) => {
      const n = Math.round(r.rating);
      if (counts[n] !== undefined) counts[n] += 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    return [5, 4, 3, 2, 1].map((star) => ({ star, count: counts[star], pct: (counts[star] / max) * 100 }));
  }, [reviews]);

  const filtered = useMemo(() => {
    let list = [...(reviews || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) =>
          r.comment?.toLowerCase().includes(term) ||
          r.userId?.name?.toLowerCase().includes(term) ||
          r.workerId?.name?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [reviews, debouncedQuery]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const act = async (id, status) => {
    try {
      await moderateReview(id, { status });
      toast.success(`Review ${status.toLowerCase()}`);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReview(confirmDelete._id);
      setConfirmDelete(null);
      toast.success('Review deleted');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'rating', header: 'Rating', render: (r) => <RatingStars rating={r.rating} size="sm" /> },
    { key: 'customer', header: 'Customer', render: (r) => r.userId?.name || '—' },
    { key: 'worker', header: 'Worker', render: (r) => r.workerId?.name || '—' },
    { key: 'job', header: 'Job', render: (r) => r.ticketId?.title || '—', mobileHidden: true },
    { key: 'review', header: 'Review', render: (r) => <p className="max-w-xs truncate text-slate-300">{r.comment}</p> },
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>, mobileHidden: true },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Visible'} meta={REVIEW_STATUS_META} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" title="Approve" onClick={() => act(r._id, 'Visible')}><Check className="h-4 w-4 text-emerald-400" /></Button>
          <Button variant="ghost" size="sm" title="Hide" onClick={() => act(r._id, 'Hidden')}><EyeOff className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" title="Report" onClick={() => act(r._id, 'Reported')}><Flag className="h-4 w-4 text-amber-400" /></Button>
          <Button variant="ghost" size="sm" title="Delete" onClick={() => setConfirmDelete(r)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
        </div>
      ),
    },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Moderate customer feedback across completed jobs." />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-bold text-white">Rating distribution</h2>
            <div className="mt-4 space-y-2">
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-3 text-sm">
                  <span className="w-10 font-mono text-slate-400">{d.star} ★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs text-slate-500">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search reviews..." />
          <DataTable columns={columns} rows={paged} empty={<EmptyState icon={Star} title="No reviews yet" description="Reviews appear after customers rate completed jobs." />} />
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Delete review" confirmLabel="Delete" danger message="Delete this review permanently?" />
    </div>
  );
};

export default Reviews;
