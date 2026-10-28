import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export const Toast = ({ message, onClose }) => {
  if (!message) return null;
  const isWarning = /blocked|could not|failed|error/i.test(message);

  return (
    <div role="status" aria-live="polite" className={`fixed bottom-5 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl sm:bottom-6 sm:right-6 ${isWarning ? 'border-amber-400/30 bg-[#19170f] text-amber-100' : 'border-emerald-400/30 bg-[#0e1b18] text-slate-100'}`}>
      <CheckCircle2 className={`h-4 w-4 shrink-0 ${isWarning ? 'text-amber-300' : 'text-emerald-300'}`} />
      <span className="font-medium">{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification" className="ml-1 rounded-md p-1 text-slate-400 transition hover:bg-white/[0.08] hover:text-white">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default Toast;
