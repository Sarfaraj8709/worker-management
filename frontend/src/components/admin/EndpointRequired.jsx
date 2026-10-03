import React from 'react';
import { Terminal } from 'lucide-react';
import { isMissingEndpoint, mockModeEnabled, MissingEndpointError } from '../../services/admin';

/**
 * Rendered when an admin page calls a backend endpoint that does not exist yet.
 * Shows exactly which endpoint must be implemented on the server.
 */
const EndpointRequired = ({ error, hint, className = '' }) => {
  const url = error instanceof MissingEndpointError ? error.url : error?.response?.config?.url;
  return (
    <div className={`rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-10 text-center ${className}`}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
        <Terminal className="h-7 w-7 text-amber-400" />
      </div>
      <h3 className="text-base font-bold text-amber-100">Backend endpoint required</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
        This module is wired up on the frontend but the server endpoint has not been implemented yet.
      </p>
      {url && (
        <code className="mt-4 inline-block rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-sky-300">
          {url}
        </code>
      )}
      {hint && <p className="mx-auto mt-3 max-w-md text-xs text-slate-500">{hint}</p>}
      {mockModeEnabled && (
        <p className="mt-3 text-xs text-emerald-400">
          Dev mock mode is ON (VITE_ADMIN_DEV_MOCK=true) — sample data is being shown instead.
        </p>
      )}
      {!isMissingEndpoint(error) && error && (
        <p className="mt-2 text-xs text-rose-400">{error.message}</p>
      )}
    </div>
  );
};

export default EndpointRequired;
