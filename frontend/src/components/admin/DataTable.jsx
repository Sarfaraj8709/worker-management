import React from 'react';

/**
 * Responsive table that renders a desktop table on md+ screens and
 * card-style rows on mobile. Column defs:
 *   { key, header, render(row), className, mobileHidden }
 */
const DataTable = ({ columns, rows = [], keyField = '_id', empty, className = '' }) => {
  const hasRows = rows.length > 0;

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {columns.map((col) => (
                  <th key={col.key} className={`whitespace-nowrap px-4 py-3 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((row) => (
                <tr key={row[keyField]} className="transition hover:bg-slate-800/30">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle text-slate-300 ${col.className || ''}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!hasRows && empty}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row[keyField]} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="space-y-3">
              {columns
                .filter((col) => !col.mobileHidden)
                .map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <span className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {col.header}
                    </span>
                    <span className="min-w-0 flex-1 text-right text-sm text-slate-200">
                      {col.render ? col.render(row) : row[col.key]}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
        {!hasRows && empty}
      </div>
    </div>
  );
};

export default DataTable;
