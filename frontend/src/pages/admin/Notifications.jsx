import React from 'react';
import { Bell } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getNotifications, markNotificationsRead, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { timeAgo } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

const Notifications = () => {
  const { toast } = useToast();
  const state = useAsync(getNotifications);
  const { data, loading, error, reload, setData } = state;

  const markAll = async () => {
    try {
      await markNotificationsRead();
      setData((prev) => (prev || []).map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked read');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Admin alerts for verification, emergencies, payments and complaints." actions={<Button variant="secondary" onClick={markAll}>Mark all read</Button>} />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={Bell} title="No notifications" description="New verification requests, emergencies and complaints will appear here." />
      ) : (
        <ul className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800">
          {data.map((n) => (
            <li key={n._id} className={`bg-slate-900/40 p-4 ${n.read ? 'opacity-70' : ''}`}>
              <p className="text-sm font-semibold text-white">{n.title}</p>
              <p className="text-sm text-slate-400">{n.body}</p>
              <p className="mt-1 text-xs text-slate-500">{timeAgo(n.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
