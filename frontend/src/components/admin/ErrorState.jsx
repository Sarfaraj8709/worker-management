import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

const ErrorState = ({ title = 'Something went wrong', message, onRetry, className = '' }) => (
  <div className={`flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-12 text-center ${className}`}>
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
      <AlertTriangle className="h-7 w-7 text-rose-400" />
    </div>
    <h3 className="text-base font-bold text-rose-200">{title}</h3>
    {message && <p className="mt-1.5 max-w-md break-words text-sm text-slate-400">{message}</p>}
    {onRetry && (
      <Button variant="secondary" className="mt-5" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </div>
);

export default ErrorState;
