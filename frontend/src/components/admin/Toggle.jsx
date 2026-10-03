import React from 'react';

const Toggle = ({ checked, onChange, disabled = false, label, description, className = '' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`group flex w-full items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition hover:border-slate-700 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
  >
    <span>
      {label && <span className="block text-sm font-semibold text-slate-100">{label}</span>}
      {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
    </span>
    <span
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
        checked ? 'border-indigo-500/50 bg-indigo-600' : 'border-slate-700 bg-slate-800'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </span>
  </button>
);

export default Toggle;
