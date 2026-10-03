import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-14 text-center ${className}`}>
    {Icon && (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/60">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
    )}
    <h3 className="text-base font-bold text-slate-100">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
