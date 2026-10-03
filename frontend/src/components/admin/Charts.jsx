import React, { useId } from 'react';
import { formatINRCompact } from '../../utils/format';

const PALETTE = ['#34d399', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#f87171', '#64748b'];

export const LineChart = ({ data = [], height = 220, formatValue = (v) => v, className = '' }) => {
  const gradId = useId().replace(/:/g, '');
  const width = 100;
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  const min = Math.min(...data.map((d) => d.value)) * 0.9;
  const range = max - min || 1;
  const pad = 6;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (width - pad * 2);
    const y = pad + (1 - (d.value - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(2)},${height} L${points[0].x.toFixed(2)},${height} Z`;

  const labelEvery = Math.ceil(data.length / 8);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full ${className}`} role="img" aria-label="Revenue chart">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((tick) => (
        <line key={tick} x1={pad} x2={width - pad} y1={height * tick} y2={height * tick} stroke="#153226" strokeDasharray="2 3" strokeWidth="0.3" />
      ))}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke="#34d399" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="1.4" fill="#0f172a" stroke="#34d399" strokeWidth="0.8" />
          {i % labelEvery === 0 && (
            <>
              <title>{`${data[i].label}: ${formatValue(data[i].value)}`}</title>
              <text x={p.x} y={height - 2} textAnchor="middle" fontSize="3.2" fill="#4e7566">
                {data[i].label}
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
};

export const BarChart = ({ data = [], height = 200, formatValue = (v) => v, className = '' }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className={className}>
      <div className="flex items-end gap-2" style={{ height: `${height}px` }}>
        {data.map((d, i) => {
          const h = Math.max(3, (d.value / max) * height);
          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="pointer-events-none absolute -top-6 z-10 hidden whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-200 group-hover:block">
                {formatValue(d.value)}
              </span>
              <div
                className="w-full max-w-9 rounded-t-md bg-indigo-500/80 transition group-hover:bg-indigo-400"
                style={{ height: `${h}px` }}
                title={d.label}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] text-slate-500" title={d.label}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const DonutChart = ({ segments = [], size = 180, formatValue = (v) => v, className = '' }) => {
  if (segments.length === 0) return null;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={`flex flex-col items-center gap-6 sm:flex-row ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const length = (seg.value / total) * circumference;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color || PALETTE[i % PALETTE.length]}
              strokeWidth={stroke}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return circle;
        })}
        <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#f4f7f5">
            {formatValue(total)}
          </text>
          <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="10" fill="#4e7566">
            Total
          </text>
        </g>
      </svg>
      <div className="w-full min-w-0 space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seg.color || PALETTE[i % PALETTE.length] }} />
              <span className="truncate text-slate-300">{seg.label}</span>
            </span>
            <span className="font-semibold text-slate-200">
              {formatValue(seg.value)} <span className="text-xs font-normal text-slate-500">({Math.round((seg.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HorizontalBars = ({ items = [], formatValue = (v) => v, className = '' }) => {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.value)) || 1;
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-300">{item.label}</span>
            <span className="font-semibold text-slate-200">{formatValue(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color || PALETTE[i % PALETTE.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export { formatINRCompact };
