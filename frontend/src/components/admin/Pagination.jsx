import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ page, totalPages, total, pageSize, onChange, className = '' }) => {
  if (!total || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);

  const base =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition';
  const active = 'border-indigo-500/50 bg-indigo-600 text-white';
  const idle = 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-300">{(page - 1) * pageSize + 1}</span>–
        <span className="font-semibold text-slate-300">{Math.min(page * pageSize, total)}</span> of{' '}
        <span className="font-semibold text-slate-300">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          className={`${base} ${idle}`}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {start > 1 && (
          <button className={`${base} ${idle}`} onClick={() => onChange(1)}>
            1
          </button>
        )}
        {start > 2 && <span className="px-1 text-xs text-slate-600">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            className={`${base} ${p === page ? active : idle}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
        {end < totalPages - 1 && <span className="px-1 text-xs text-slate-600">…</span>}
        {end < totalPages && (
          <button className={`${base} ${idle}`} onClick={() => onChange(totalPages)}>
            {totalPages}
          </button>
        )}
        <button
          className={`${base} ${idle}`}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
