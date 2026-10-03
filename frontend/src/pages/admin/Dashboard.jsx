import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  HardHat,
  Briefcase,
  CheckCircle2,
  IndianRupee,
  ShieldCheck,
  UserPlus,
  Plus,
  ArrowRight,
  ShieldAlert,
  MessageSquareWarning,
  Wallet,
  ClipboardList,
  FileSearch,
  BadgeCheck,
  X,
  LineChart as LineChartIcon,
} from 'lucide-react';
import StatCard from '../../components/admin/StatCard';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { StatsGridSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { LineChart, BarChart, DonutChart } from '../../components/admin/Charts';
import Tabs from '../../components/admin/Tabs';
import { getAdminMetrics, getRevenueSeries, getAnalytics, getRecentActivity, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { formatNumber, formatINRCompact, timeAgo } from '../../utils/format';

const RANGE_OPTIONS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '3m', label: '3 Months' },
  { id: '1y', label: '1 Year' },
];

const ACTIVITY_ICONS = {
  approve: { icon: BadgeCheck, cls: 'bg-emerald-500/10 text-emerald-400' },
  ticket: { icon: ClipboardList, cls: 'bg-indigo-500/10 text-indigo-400' },
  payment: { icon: Wallet, cls: 'bg-sky-500/10 text-sky-400' },
  complaint: { icon: MessageSquareWarning, cls: 'bg-rose-500/10 text-rose-400' },
  verify: { icon: ShieldCheck, cls: 'bg-amber-500/10 text-amber-400' },
  emergency: { icon: FileSearch, cls: 'bg-violet-500/10 text-violet-400' },
};

const CHART_KEYS = ['revenue', 'jobAnalytics', 'serviceMix'];
const STORAGE_KEY = 'admin.dashboard.hiddenCharts';

const readHiddenCharts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter((key) => CHART_KEYS.includes(key)) : [];
  } catch {
    return [];
  }
};

const ChartRemoveButton = ({ label, onRemove }) => (
  <button
    type="button"
    onClick={onRemove}
    title={`Remove ${label}`}
    aria-label={`Remove ${label}`}
    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
  >
    <X className="h-3.5 w-3.5" />
  </button>
);

const Dashboard = () => {
  const metricsState = useAsync(getAdminMetrics);
  const analyticsState = useAsync(getAnalytics, { autoReload: false });
  const activityState = useAsync(getRecentActivity, { autoReload: false });
  const [range, setRange] = React.useState('30d');
  const revenueState = useAsync(() => getRevenueSeries(range), { autoReload: false });

  const [hiddenCharts, setHiddenCharts] = React.useState(readHiddenCharts);

  React.useEffect(() => {
    revenueState.reload();
  }, [range]);

  const hideChart = (key) => {
    setHiddenCharts((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage can fail (private mode, full disk) - state still works for this visit
      }
      return next;
    });
  };

  const restoreCharts = () => {
    setHiddenCharts([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  };

  const metrics = metricsState.data;
  const analytics = analyticsState.data;
  const revenue = revenueState.data;
  const activity = activityState.data;

  const tickets = metrics?.tickets || {};
  const workers = metrics?.workers || {};
  const users = metrics?.users || {};
  const revenueMeta = metrics?.revenue || {};

  const revenueValue = revenueMeta?.total;
  const verificationPending = metrics?.verificationPending;

  const quickActions = [
    { label: 'Add Worker', to: '/admin/workers/new', icon: UserPlus },
    { label: 'Add Service', to: '/admin/services', icon: Plus },
    { label: 'Verification Requests', to: '/admin/verification', icon: ShieldAlert },
    { label: 'View Complaints', to: '/admin/complaints', icon: MessageSquareWarning },
  ];

  const jobAnalytics = [
    { label: 'New requests', value: analytics?.jobs?.new || tickets?.pending || 0, color: '#22d3ee' },
    { label: 'Assigned', value: tickets?.assigned || 0, color: '#34d399' },
    { label: 'In progress', value: tickets?.inProgress || 0, color: '#fbbf24' },
    { label: 'Completed', value: tickets?.completed || 0, color: '#34d399' },
    { label: 'Cancelled', value: tickets?.cancelled || 0, color: '#f87171' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Platform overview and key metrics across FixMate."
        actions={<Button variant="secondary" onClick={() => metricsState.reload()}>Refresh</Button>}
      />

      {/* Stat cards */}
      {metricsState.loading ? (
        <StatsGridSkeleton count={6} />
      ) : metricsState.error ? (
        isMissingEndpoint(metricsState.error) ? (
          <EndpointRequired error={metricsState.error} />
        ) : (
          <ErrorState message={getErrorMessage(metricsState.error)} onRetry={metricsState.reload} />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total Users" value={users?.total ? formatNumber(users.total) : '—'} trend={users?.growth} icon={Users} />
          <StatCard label="Total Workers" value={formatNumber(workers?.total)} trend={workers?.growth} icon={HardHat} />
          <StatCard label="Active Jobs" value={formatNumber(tickets?.total)} sub={`${formatNumber(tickets?.pending)} pending`} icon={Briefcase} iconClass="bg-amber-500/10 text-amber-400 border-amber-500/20" />
          <StatCard label="Completed Jobs" value={formatNumber(tickets?.completed)} icon={CheckCircle2} iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
          <StatCard label="Platform Revenue" value={revenueValue ? formatINRCompact(revenueValue) : '—'} trend={revenueMeta?.growth} icon={IndianRupee} iconClass="bg-sky-500/10 text-sky-400 border-sky-500/20" />
          <StatCard label="Pending Verification" value={verificationPending !== undefined ? formatNumber(verificationPending) : '—'} icon={ShieldCheck} iconClass="bg-rose-500/10 text-rose-400 border-rose-500/20" />
        </div>
      )}

      {/* Chart visibility restore banner */}
      {hiddenCharts.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-3">
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <LineChartIcon className="h-4 w-4 text-slate-500" />
            {hiddenCharts.length} chart{hiddenCharts.length > 1 ? 's' : ''} hidden
          </p>
          <button
            type="button"
            onClick={restoreCharts}
            className="text-xs font-semibold text-indigo-400 transition hover:text-indigo-300"
          >
            Restore all charts
          </button>
        </div>
      )}

      {/* Revenue chart */}
      {!hiddenCharts.includes('revenue') && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Revenue</h2>
              <p className="text-xs text-slate-500">Platform revenue over the selected period</p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs tabs={RANGE_OPTIONS} active={range} onChange={setRange} />
              <ChartRemoveButton label="Revenue chart" onRemove={() => hideChart('revenue')} />
            </div>
          </div>
          {revenueState.loading ? (
            <div className="h-[220px] animate-pulse rounded-xl bg-slate-800/50" />
          ) : revenueState.error ? (
            <EndpointRequired error={revenueState.error} />
          ) : revenue ? (
            <LineChart data={revenue} formatValue={formatINRCompact} />
          ) : (
            <EmptyState title="No revenue data" description="Revenue data will appear here once the analytics endpoint is available." />
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Job analytics */}
        {!hiddenCharts.includes('jobAnalytics') && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Job Analytics</h2>
                <p className="text-xs text-slate-500">Current ticket status breakdown</p>
              </div>
              <ChartRemoveButton label="Job Analytics chart" onRemove={() => hideChart('jobAnalytics')} />
            </div>
            <div className="mt-5">
              <BarChart data={jobAnalytics} formatValue={formatNumber} height={180} />
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-base font-bold text-white">Quick Actions</h2>
          <p className="text-xs text-slate-500">Common administrative tasks</p>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 transition hover:border-indigo-500/40 hover:bg-indigo-500/5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <action.icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm font-semibold text-slate-200">{action.label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-indigo-400" />
              </Link>
            ))}
          </div>
          {!hiddenCharts.includes('serviceMix') && (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">Service Mix</h3>
                <ChartRemoveButton label="Service Mix chart" onRemove={() => hideChart('serviceMix')} />
              </div>
              {analytics?.services?.length ? (
                <DonutChart
                  segments={analytics.services.map((s, i) => ({
                    label: s.name,
                    value: s.count || s.pct,
                    color: ['#22d3ee', '#34d399', '#34d399', '#fbbf24', '#f472b6'][i % 5],
                  }))}
                  size={150}
                  formatValue={formatNumber}
                />
              ) : (
                <EmptyState title="No service mix yet" description="Category share appears after jobs are created." />
              )}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Recent Activity</h2>
            <Link to="/admin/audit-log" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View audit log
            </Link>
          </div>
          <p className="text-xs text-slate-500">Latest platform events</p>
          {activityState.loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-800" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 animate-pulse rounded bg-slate-800" />
                    <div className="h-2 w-20 animate-pulse rounded bg-slate-800/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : activityState.error ? (
            <ErrorState message={getErrorMessage(activityState.error)} onRetry={activityState.reload} />
          ) : activity && activity.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {activity.map((item) => {
                const meta = ACTIVITY_ICONS[item.icon] || ACTIVITY_ICONS.ticket;
                return (
                  <li key={item.id} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-slate-800/40">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}>
                      <meta.icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">{item.title}</p>
                      <p className="text-xs text-slate-500">{timeAgo(item.time)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No recent activity" />
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
