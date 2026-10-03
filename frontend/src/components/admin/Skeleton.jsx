import React from 'react';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-800/70 ${className}`} />
);

export const CardSkeleton = () => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="mt-3 h-8 w-16" />
    <Skeleton className="mt-2 h-3 w-28" />
  </div>
);

export const StatsGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 6, cols = 6 }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
    <div className="flex items-center gap-4 border-b border-slate-800 px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 border-b border-slate-800/50 px-4 py-3.5 last:border-0">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-3 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const PageSkeleton = ({ table = false }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
    {table ? (
      <TableSkeleton />
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )}
  </div>
);

export default Skeleton;
