import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { JOB_STATUS_STEPS, JOB_STATUS_META } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';

const STEP_TO_STATUS = {
  'Request Created': 'OPEN',
  'Worker Searching': 'Pending',
  'Worker Assigned': 'Assigned',
  'Worker Accepted': 'ACCEPTED',
  'Worker On The Way': 'WORKER_ON_THE_WAY',
  'Arrived At Site': 'ARRIVED',
  'Service Started': 'IN_PROGRESS',
  'Service Completed': 'Completed',
  Payment: 'Completed',
};

const JobTimeline = ({ status, events = [] }) => {
  const currentIndex = JOB_STATUS_STEPS.findIndex((step) => {
    const stepStatus = STEP_TO_STATUS[step.label];
    return stepStatus === status || (stepStatus === 'Completed' && status === 'Completed');
  });

  return (
    <ol className="relative space-y-0">
      {JOB_STATUS_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex && currentIndex !== -1;
        const statusMeta = JOB_STATUS_META[STEP_TO_STATUS[step.label]];
        const event = events.find((e) => (e.status || '').toLowerCase() === step.label.toLowerCase());
        const label = statusMeta?.label || step.label;

        return (
          <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
            {i < JOB_STATUS_STEPS.length - 1 && (
              <span className={`absolute left-[11px] top-6 h-full w-px ${done ? 'bg-indigo-500/50' : 'bg-slate-800'}`} />
            )}
            <span
              className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                done
                  ? 'border-indigo-500/50 bg-indigo-600 text-white'
                  : isCurrent
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-slate-700 bg-slate-900 text-slate-600'
              }`}
            >
              {done && !isCurrent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm font-semibold ${done ? 'text-slate-100' : isCurrent ? 'text-amber-300' : 'text-slate-500'}`}>
                {label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {event?.at ? formatDateTime(event.at) : isCurrent ? 'In progress' : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default JobTimeline;
