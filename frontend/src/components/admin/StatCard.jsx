import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ label, value, sub, trend, icon: Icon, iconClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', loading = false }) => {
  const isUp = Number(trend) >= 0;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-800" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
          )}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {trend !== undefined && trend !== null && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
              isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isUp ? '+' : ''}
            {trend}%
          </span>
        )}
        {sub && <span className="truncate text-xs text-slate-500">{sub}</span>}
      </div>
    </div>
  );
};

export default StatCard;
