import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, Clock, Sparkles, Loader2 } from 'lucide-react';

export const CreatePollModal = ({ isOpen, onClose, onPollCreated, onToast }) => {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationMinutes, setDurationMinutes] = useState('0'); // 0 = never expires
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const titleInputRef = useRef(null);
  const dialogRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const isSubmittingRef = useRef(isSubmitting);
  onCloseRef.current = onClose;
  isSubmittingRef.current = isSubmitting;

  useEffect(() => {
    if (!isOpen) return undefined;
    previousActiveElementRef.current = document.activeElement;
    titleInputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmittingRef.current) {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) {
        event.preventDefault();
        titleInputRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const previous = previousActiveElementRef.current;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide a poll question or title.');
      return;
    }

    const validOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: trimmedTitle,
          options: validOptions,
          durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create poll');
      }

      onToast?.('Poll created and broadcasted successfully!');
      onPollCreated(data.data);
      onClose();

      // Reset Form
      setTitle('');
      setOptions(['', '']);
      setDurationMinutes('0');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => { if (!isSubmitting) onClose(); }}
      />

      {/* Modal Dialog */}
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="create-poll-title" className="relative z-10 w-full max-w-lg rounded-3xl border border-white/[0.10] bg-[#111726] p-6 text-slate-100 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#1f2b45]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="create-poll-title" className="text-lg font-bold text-white">Create new poll</h3>
              <p className="text-xs text-slate-400">Launch an instant, real-time vote</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Question / Title */}
          <div>
            <label htmlFor="poll-question" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Question or topic
            </label>
            <input
              ref={titleInputRef}
              id="poll-question"
              type="text"
              required
              maxLength={240}
              placeholder="e.g. Which web framework do you prefer in 2026?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0a0d14] border border-[#1f2b45] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Options */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Poll options (min 2, max 10)
            </span>
            <div className="space-y-2.5">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 w-5 text-right">
                    {idx + 1}.
                  </span>
                  <input
                    aria-label={`Poll option ${idx + 1}`}
                    type="text"
                    required
                    maxLength={120}
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#0a0d14] border border-[#1f2b45] focus:border-emerald-500 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      aria-label={`Remove option ${idx + 1}`}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Option
              </button>
            )}
          </div>

          {/* Expiration Settings */}
          <div>
            <label htmlFor="poll-duration" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Poll Duration
            </label>
            <select
              id="poll-duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0d14] border border-[#1f2b45] text-sm text-slate-200 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="0">Never expires (Permanent)</option>
              <option value="15">15 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="1440">24 Hours</option>
              <option value="10080">7 Days</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#1f2b45]/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 active:scale-95 rounded-xl transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create & Broadcast'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePollModal;
