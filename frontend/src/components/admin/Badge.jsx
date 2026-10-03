import React from 'react';
import { TONES, resolveTone } from '../../utils/tone';

const Badge = ({ children, tone, dot = false, className = '', title }) => {
  const resolved = TONES[tone || 'neutral'];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${resolved.badge} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${resolved.dot}`} />}
      {children}
    </span>
  );
};

/** Badge that resolves tone from a status value + optional meta map. */
export const StatusBadge = ({ status, meta, ...props }) => (
  <Badge {...props} tone={resolveTone(status, meta)}>
    {meta?.[status]?.label ?? status}
  </Badge>
);

export default Badge;
