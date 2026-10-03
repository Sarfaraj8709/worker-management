import React, { useState } from 'react';
import { Siren } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getEmergencyRequests, updateEmergencyConfig, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { SERVICE_OPTIONS, JOB_STATUS_META } from '../../utils/constants';
import { timeAgo } from '../../utils/format';

const DEFAULT_EMERGENCY = ['Plumbing', 'Electrical', 'AC Repair', 'Door Lock', 'Water Leakage'];

const Emergency = () => {
  const { toast } = useToast();
  const state = useAsync(getEmergencyRequests);
  const { data: requests, loading, error, reload } = state;
  const [selected, setSelected] = useState(null);

  React.useEffect(() => {
    const fromApi = requests?.config?.services;
    if (fromApi) setSelected(fromApi);
    else if (selected === null) setSelected(DEFAULT_EMERGENCY);
  }, [requests]);

  const toggle = (name) => {
    setSelected((prev) => (prev || []).includes(name) ? prev.filter((s) => s !== name) : [...(prev || []), name]);
  };

  const save = async () => {
    try {
      await updateEmergencyConfig(selected || []);
      toast.success('Emergency services updated');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Emergency services" description="Prioritize available, nearby, skilled, highly rated workers with strong response rates." />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <p className="text-sm font-bold text-rose-200">🚨 {(requests || []).length} active emergencies</p>
            <p className="mt-1 text-xs text-slate-400">Matching order: availability → distance → skill → rating → response rate.</p>
          </div>
          {(requests || []).length === 0 ? (
            <EmptyState icon={Siren} title="No active emergencies" description="Emergency-severity jobs that are still open will appear here." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(requests || []).map((r) => (
                <div key={r._id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{r.title}</p>
                      <p className="text-xs text-slate-500">{r.category} • {r.distance} • {timeAgo(r.createdAt)}</p>
                    </div>
                    <StatusBadge status={r.status} meta={JOB_STATUS_META} />
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{r.worker ? `Worker: ${r.worker}` : 'Searching for worker...'}</p>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-bold text-white">Enabled emergency categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...new Set([...SERVICE_OPTIONS.map((s) => s.value), ...DEFAULT_EMERGENCY])].map((name) => {
                const on = (selected || []).includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggle(name)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-indigo-500/50 bg-indigo-600 text-white' : 'border-slate-700 text-slate-400'}`}
                  >
                    {on ? '✓ ' : ''}{name}
                  </button>
                );
              })}
            </div>
            <Button className="mt-4" onClick={save}>Save configuration</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Emergency;
