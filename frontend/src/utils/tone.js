export const TONES = {
  neutral: { badge: 'bg-slate-800/60 text-slate-300 border-slate-700', dot: 'bg-slate-400', text: 'text-slate-300' },
  info: { badge: 'bg-sky-500/10 text-sky-300 border-sky-500/30', dot: 'bg-sky-400', text: 'text-sky-300' },
  warning: { badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-400', text: 'text-amber-300' },
  success: { badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  danger: { badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30', dot: 'bg-rose-400', text: 'text-rose-300' },
};

/** Resolve a tone string from a status against an optional meta map. */
export const resolveTone = (status, metaMap) => {
  if (metaMap && metaMap[status]) return metaMap[status].tone || 'neutral';
  if (typeof status === 'string') {
    const lower = status.toLowerCase();
    if (/complete|approv|active|paid|resolve|success|verified|visible/.test(lower)) return 'success';
    if (/cancel|reject|fail|disput|suspended|reported|critical/.test(lower)) return 'danger';
    if (/pend|wait|progress|assigned|search|review|accept|investigat/.test(lower)) return 'warning';
    if (/assigned|accepted|new|open|inform|away|way|arrived/.test(lower)) return 'info';
  }
  return 'neutral';
};

export const TONE_ICON_COLORS = {
  neutral: 'text-slate-400',
  info: 'text-sky-400',
  warning: 'text-amber-400',
  success: 'text-emerald-400',
  danger: 'text-rose-400',
};
