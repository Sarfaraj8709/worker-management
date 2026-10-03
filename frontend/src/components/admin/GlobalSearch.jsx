import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Users, HardHat, ClipboardList, Wrench, CreditCard, MessageSquareWarning, CornerDownLeft, Loader2 } from 'lucide-react';
import { globalSearch } from '../../services/admin';
import { getErrorMessage } from '../../services/admin';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Avatar from './Avatar';

const SECTIONS = [
  { key: 'users', label: 'Users', icon: Users, link: (id) => `/admin/users` },
  { key: 'workers', label: 'Workers', icon: HardHat, link: (id) => `/admin/workers/${id}` },
  { key: 'jobs', label: 'Jobs', icon: ClipboardList, link: (id) => `/admin/jobs/${id}` },
  { key: 'services', label: 'Services', icon: Wrench, link: () => `/admin/services` },
  { key: 'transactions', label: 'Transactions', icon: CreditCard, link: () => `/admin/payments` },
  { key: 'complaints', label: 'Complaints', icon: MessageSquareWarning, link: (id) => `/admin/complaints/${id}` },
];

const GlobalSearch = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounced = useDebouncedValue(query, 300);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
      setError(null);
      setActiveIndex(-1);
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!debounced.trim()) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    globalSearch(debounced.trim())
      .then((data) => !cancelled && setResults(data))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  if (!open) return null;

  const flatItems = SECTIONS.flatMap((section) =>
    (results?.[section.key] || []).map((item) => ({ section, item }))
  );

  const go = (section, item) => {
    const id = item._id || item.id;
    navigate(section.link(id));
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }
    if (e.key === 'Enter' && activeIndex >= 0 && flatItems[activeIndex]) {
      const { section, item } = flatItems[activeIndex];
      go(section, item);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-20 sm:pt-28" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-[#121215] shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5">
          <Search className="h-5 w-5 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, workers, jobs, services, transactions, complaints..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
          <kbd className="hidden rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {error && <p className="p-4 text-center text-sm text-rose-400">{getErrorMessage(error)}</p>}
          {!loading && !error && debounced && flatItems.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">No results for "{debounced}".</p>
          )}
          {!loading && !error && flatItems.length > 0 && (
            <div className="space-y-4">
              {SECTIONS.map((section) => {
                const items = results?.[section.key] || [];
                if (items.length === 0) return null;
                return (
                  <div key={section.key}>
                    <p className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      <section.icon className="h-3.5 w-3.5" />
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((item, localIndex) => {
                        const flatIndex = flatItems.findIndex((f) => f.section.key === section.key && f.item === item);
                        const name = item.userId?.name || item.name || item.title || item.complaintId || item.transactionId || item.code || '';
                        const subtitle =
                          (item.skills?.length && item.skills.join(', ')) ||
                          item.email ||
                          item.category ||
                          item.jobId ||
                          item._id ||
                          '';
                        return (
                          <button
                            key={item._id || item.id}
                            onClick={() => go(section, item)}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                              flatIndex === activeIndex ? 'bg-indigo-600/15 ring-1 ring-inset ring-indigo-500/30' : 'hover:bg-slate-800/60'
                            }`}
                          >
                            {item.userId?.name || item.name ? (
                              <Avatar name={name} size="sm" />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                                <section.icon className="h-4 w-4" />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-200">{name}</span>
                              <span className="block truncate text-xs text-slate-500">{subtitle}</span>
                            </span>
                            {flatIndex === activeIndex && <CornerDownLeft className="h-4 w-4 shrink-0 text-slate-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!debounced && (
            <p className="p-6 text-center text-sm text-slate-500">Type to search across the platform.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GlobalSearch;
