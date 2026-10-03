import React from 'react';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { DonutChart } from '../../components/admin/Charts';
import { getAnalytics, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { formatNumber, formatINRCompact } from '../../utils/format';
import { Users, HardHat, ClipboardList, IndianRupee } from 'lucide-react';

const Analytics = () => {
  const state = useAsync(getAnalytics);
  const { data, loading, error, reload } = state;
  const users = data?.users || {};
  const workers = data?.workers || {};
  const jobs = data?.jobs || {};
  const revenue = data?.revenue || {};
  const services = data?.services || [];

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Live platform metrics from FixMate data." actions={<button className="text-sm text-indigo-400" onClick={reload}>Refresh</button>} />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-bold text-white">Users</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="New users" value={formatNumber(users.new)} icon={Users} />
              <StatCard label="Active users" value={formatNumber(users.active)} />
              <StatCard label="Customers" value={formatNumber(users.customers)} />
              <StatCard label="Workers" value={formatNumber(users.workers)} />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-bold text-white">Workers</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="New workers" value={formatNumber(workers.new)} icon={HardHat} />
              <StatCard label="Verified" value={formatNumber(workers.verified)} />
              <StatCard label="Active" value={formatNumber(workers.active)} />
              <StatCard label="Utilization" value={`${workers.utilization || 0}%`} />
              <StatCard label="Avg rating" value={workers.averageRating || '—'} />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-bold text-white">Jobs</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Requests" value={formatNumber(jobs.requests)} icon={ClipboardList} />
              <StatCard label="Completion rate" value={`${jobs.completionRate || 0}%`} />
              <StatCard label="Cancellation rate" value={`${jobs.cancellationRate || 0}%`} />
              <StatCard label="Avg completion" value={jobs.avgCompletionHours ? `${jobs.avgCompletionHours}h` : '—'} />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-bold text-white">Revenue</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Gross" value={formatINRCompact(revenue.gross)} icon={IndianRupee} />
              <StatCard label="Net" value={formatINRCompact(revenue.net)} />
              <StatCard label="Worker payouts" value={formatINRCompact(revenue.payouts)} />
              <StatCard label="Commission" value={`${revenue.commission || 0}%`} />
              <StatCard label="Refunds" value={formatINRCompact(revenue.refunds)} />
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-bold text-white">Services mix</h2>
            {services.length === 0 ? (
              <EmptyState title="No job data yet" description="Service share appears after tickets are created." />
            ) : (
              <div className="mt-4">
                <DonutChart
                  segments={services.map((s, i) => ({ label: s.name, value: s.count || s.pct, color: ['#22d3ee', '#34d399', '#34d399', '#fbbf24', '#f472b6'][i % 5] }))}
                  formatValue={formatNumber}
                />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Analytics;
