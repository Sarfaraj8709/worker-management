import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import Button from './Button';

const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${sizes[size] || sizes.md} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#121215] p-6 shadow-2xl shadow-black/50`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${danger ? 'border-rose-500/30 bg-rose-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
        <AlertTriangle className={`h-5 w-5 ${danger ? 'text-rose-400' : 'text-amber-400'}`} />
      </div>
      <p className="pt-1.5 text-sm leading-relaxed text-slate-300">{message}</p>
    </div>
  </Modal>
);

export default Modal;
