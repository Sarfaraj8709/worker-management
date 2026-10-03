import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);
let toastId = 0;

const icons = {
  success: { icon: CheckCircle2, className: 'text-emerald-400', ring: 'border-emerald-500/30' },
  error: { icon: XCircle, className: 'text-rose-400', ring: 'border-rose-500/30' },
  info: { icon: Info, className: 'text-sky-400', ring: 'border-sky-500/30' },
  warning: { icon: AlertTriangle, className: 'text-amber-400', ring: 'border-amber-500/30' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (type, message, duration = 4000) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const toast = useCallback(
    {
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
      warning: (message) => push('warning', message),
    },
    [push]
  );

  const value = { toast, dismiss };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastViewport = ({ toasts, onDismiss }) => (
  <div
    aria-live="polite"
    className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
  >
    {toasts.map((toast) => {
      const meta = icons[toast.type] || icons.info;
      const Icon = meta.icon;
      return (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${meta.ring} bg-[#0a1f17]/95 p-3.5 shadow-xl shadow-black/40 backdrop-blur`}
        >
          <Icon className={`h-5 w-5 shrink-0 ${meta.className}`} />
          <p className="flex-1 text-sm font-medium leading-snug text-slate-100">{toast.message}</p>
          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 rounded-md p-0.5 text-slate-500 transition hover:text-slate-200"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    })}
  </div>
);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
