import React, { useEffect, useState } from 'react';
import { Bell, ShieldCheck, MessageSquareWarning, Siren, CreditCard, Flag, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationsRead } from '../../services/admin';
import { timeAgo } from '../../utils/format';

const typeMeta = {
  verify: { icon: ShieldCheck, color: 'text-sky-400', to: '/admin/verification' },
  complaint: { icon: MessageSquareWarning, color: 'text-rose-400', to: '/admin/complaints' },
  emergency: { icon: Siren, color: 'text-amber-400', to: '/admin/emergency' },
  payment: { icon: CreditCard, color: 'text-emerald-400', to: '/admin/payments' },
  report: { icon: Flag, color: 'text-violet-400', to: '/admin/complaints' },
};

const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setError(false);
    } catch (err) {
      setError(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAll = async () => {
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const goTo = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:text-slate-200"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-[#121215] shadow-2xl shadow-black/50 sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-bold text-white">Notifications</p>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={markAll} className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button onClick={() => goTo('/admin/notifications')} className="text-xs font-semibold text-slate-500 hover:text-slate-200">
                  View all
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {error && (
                <p className="p-5 text-center text-xs text-slate-500">
                  Notifications backend endpoint not implemented yet.
                </p>
              )}
              {!error && notifications.length === 0 && (
                <p className="p-6 text-center text-xs text-slate-500">You're all caught up.</p>
              )}
              {!error &&
                notifications.map((n) => {
                  const meta = typeMeta[n.type] || typeMeta.payment;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={n._id}
                      onClick={() => goTo(meta.to)}
                      className="flex w-full items-start gap-3 border-b border-slate-800/60 px-4 py-3 text-left transition last:border-0 hover:bg-slate-800/40"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${n.read ? 'text-slate-400' : 'text-slate-100'}`}>
                          {n.title}
                        </span>
                        {n.body && <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-slate-600">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
