import React from 'react';
import { Search, X } from 'lucide-react';

const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '', autoFocus = false }) => (
  <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    <input
      autoFocus={autoFocus}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-9 text-sm text-slate-200 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 transition hover:text-slate-200"
        aria-label="Clear search"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

export default SearchInput;
