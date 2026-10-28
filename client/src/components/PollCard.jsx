import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketPoll } from '../hooks/useSocketPoll.js';
import { 
  Users, 
  Clock, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  BarChart3 
} from 'lucide-react';

export const PollCard = ({ initialPoll, onShareToast }) => {
  const {
    poll,
    liveViewers,
    castVote,
    isVoting,
    voteError,
    hasVoted,
    userVotedOptionId,
  } = useSocketPoll(initialPoll);

  const [copied, setCopied] = useState(false);

  if (!poll) return null;

  const totalVotes = poll.totalVotes || 0;
  const isExpired = poll.isActive === false || poll.isExpired || (poll.expiresAt && new Date() > new Date(poll.expiresAt));

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('poll', poll._id);
    const shareUrl = url.toString();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopied(true);
      onShareToast?.('Poll link copied to clipboard!');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers and non-secure origins may not expose the Clipboard API.
      let temporaryInput;
      try {
        temporaryInput = document.createElement('textarea');
        temporaryInput.value = shareUrl;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        if (!copied) throw new Error('Legacy clipboard copy failed');
        setCopied(true);
        onShareToast?.('Poll link copied to clipboard!');
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        onShareToast?.(`Copy this poll link: ${shareUrl}`);
      } finally {
        temporaryInput?.remove();
      }
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return hours > 0 ? `${hours}h ${minutes}m left` : `${Math.max(minutes, 1)}m left`;
  };

  return (
    <motion.article 
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative bg-[#111726]/85 backdrop-blur-xl border border-[#1f2b45] hover:border-slate-700/80 rounded-2xl p-6 transition-colors shadow-xl shadow-black/20 group"
    >
      {/* Top Header: Metadata & Share */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
              <BarChart3 className="w-3 h-3 text-emerald-400" />
              <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
            </span>

            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>{liveViewers} live</span>
            </span>

            {poll.expiresAt && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                isExpired 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}>
                <Clock className="w-3 h-3" />
                <span>{formatTimeRemaining(poll.expiresAt)}</span>
              </span>
            )}
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight leading-snug pt-1">
            {poll.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={handleShare}
          title="Copy poll link"
          aria-label={`Share poll: ${poll.title}`}
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 hidden sm:inline">Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>
      </div>

      {/* Error alert if vote failed */}
      <AnimatePresence>
        {voteError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 overflow-hidden"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{voteError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poll Options List */}
      <div className="space-y-3">
        {poll.options.map((option) => {
          const votes = option.votes || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = userVotedOptionId === option._id;
          const isDisabled = hasVoted || isExpired || isVoting;

          return (
            <motion.button
              key={option._id}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={`${option.text}, ${votes} ${votes === 1 ? 'vote' : 'votes'}, ${percentage} percent`}
              onClick={() => castVote(option._id)}
              whileHover={!isDisabled ? { scale: 1.01 } : {}}
              whileTap={!isDisabled ? { scale: 0.99 } : {}}
              className={`w-full relative overflow-hidden rounded-xl p-3.5 text-left border transition-colors ${
                isDisabled ? 'cursor-default' : 'cursor-pointer hover:border-emerald-500/50'
              } ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                  : 'border-[#1f2b45] bg-[#0c101c]/90'
              }`}
            >
              {/* Framer Motion Animated Progress Bar */}
              <motion.div
                initial={false}
                animate={{ width: `${percentage}%` }}
                transition={{ type: 'spring', stiffness: 70, damping: 14 }}
                className={`absolute inset-y-0 left-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-600/35 via-emerald-500/25 to-emerald-400/15'
                    : 'bg-gradient-to-r from-slate-700/35 via-slate-700/20 to-transparent'
                }`}
              />

              {/* Option Foreground Content */}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full border shrink-0 transition-colors ${
                        hasVoted
                          ? 'border-slate-600'
                          : 'border-slate-500 group-hover:border-slate-400'
                      }`}
                    />
                  )}
                  <span
                    className={`text-sm font-medium leading-5 break-words ${
                      isSelected ? 'text-emerald-300 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-slate-400 tabular-nums font-mono">
                    {votes} {votes === 1 ? 'vote' : 'votes'}
                  </span>
                  <span
                    className={`font-bold tabular-nums font-mono px-2 py-0.5 rounded-md text-xs ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-[#1f2b45]/60 flex items-center justify-between text-xs text-slate-500">
        <div>
          {hasVoted ? (
            <span className="text-emerald-400/90 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Your vote has been counted
            </span>
          ) : isExpired ? (
            <span className="text-slate-500 font-medium">Poll closed to new votes</span>
          ) : (
            <span>Click any option to vote instantly</span>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Created {new Date(poll.createdAt).toLocaleDateString()}
        </div>
      </div>
    </motion.article>
  );
};

export default PollCard;
