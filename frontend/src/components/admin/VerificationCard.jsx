import React from 'react';
import { CheckCircle2, XCircle, MessageSquareText, Eye } from 'lucide-react';
import { StatusBadge } from './Badge';
import Button from './Button';
import { VERIFICATION_DOC_STATUS_META } from '../../utils/constants';

const VerificationCard = ({
  label,
  icon: Icon,
  value,
  status,
  required,
  verifiedAt,
  submittedAt,
  rejectionReason,
  note,
  onApprove,
  onReject,
  onRequestInfo,
  onView,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400">
            <Icon className="h-4 w-4" />
          </span>}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{label}</p>
            {value && <p className="text-xs text-slate-500 truncate font-mono">{value}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} meta={VERIFICATION_DOC_STATUS_META} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            status === 'verified' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
            status === 'rejected' || status === 'expired' ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' :
            status === 'pending' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
            'border-slate-700 bg-slate-900 text-slate-500'
          }`}>
            <Icon className="h-5 w-5" />
          </span>}
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              {label}
              {required && <span className="text-[10px] font-semibold text-rose-400">Required</span>}
            </p>
            {value && <p className="text-xs text-slate-500 font-mono">{value}</p>}
            <div className="mt-1.5">
              <StatusBadge status={status} meta={VERIFICATION_DOC_STATUS_META} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {submittedAt && <p className="text-xs text-slate-500">Submitted {submittedAt}</p>}
        {verifiedAt && <p className="text-xs text-slate-500">Verified on {verifiedAt}</p>}
        {rejectionReason && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs text-rose-300">
            <strong>Reason:</strong> {rejectionReason}
          </div>
        )}
        {note && <p className="text-xs text-slate-500 italic">{note}</p>}
      </div>

      {(onApprove || onReject || onRequestInfo || onView) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onApprove && status !== 'verified' && (
            <Button size="sm" onClick={onApprove} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </Button>
          )}
          {onReject && status !== 'rejected' && status !== 'expired' && (
            <Button variant="danger" size="sm" onClick={onReject} className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
          {onRequestInfo && (
            <Button variant="secondary" size="sm" onClick={onRequestInfo} className="flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" /> Request Info
            </Button>
          )}
          {onView && (
            <Button variant="ghost" size="sm" onClick={onView} className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> View
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationCard;
