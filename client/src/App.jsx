import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Vote,
  Wifi,
} from 'lucide-react';
import LiveBadge from './components/LiveBadge.jsx';
import PollCard from './components/PollCard.jsx';
import CreatePollModal from './components/CreatePollModal.jsx';
import Toast from './components/Toast.jsx';
import { socketService } from './services/socket.js';
import { getLocalVotedPolls } from './utils/fingerprint.js';

const filterOptions = [
  { id: 'all', label: 'All polls' },
  { id: 'active', label: 'Active' },
  { id: 'voted', label: 'My votes' },
];

export default function App() {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [sharedPollId, setSharedPollId] = useState(() => new URLSearchParams(window.location.search).get('poll'));
  const [votedPolls, setVotedPolls] = useState(() => getLocalVotedPolls());
  const toastTimer = useRef(null);

  const triggerToast = useCallback((message) => {
    setToastMessage(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const fetchPolls = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError('');

    try {
      const response = await fetch('/api/polls?limit=50');
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'The polls could not be loaded.');
      }
      setPolls((current) => {
        const incoming = Array.isArray(payload.data) ? payload.data : [];
        const selectedPoll = sharedPollId ? current.find((poll) => poll._id === sharedPollId) : null;
        return selectedPoll && !incoming.some((poll) => poll._id === selectedPoll._id)
          ? [...incoming, selectedPoll]
          : incoming;
      });
    } catch (error) {
      setLoadError(error.message || 'Could not connect to PulsePoll.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sharedPollId]);

  const addPollOnce = useCallback((poll) => {
    if (!poll?._id) return;
    setPolls((current) => current.some((item) => item._id === poll._id)
      ? current.map((item) => item._id === poll._id ? { ...item, ...poll } : item)
      : [poll, ...current]);
  }, []);

  useEffect(() => {
    fetchPolls();
    const socket = socketService.getSocket();

    const handleLobbyUpdate = ({ pollId, totalVotes, options }) => {
      setPolls((current) => current.map((poll) => poll._id === pollId
        ? { ...poll, totalVotes, options }
        : poll));
    };
    const handlePollCreated = (poll) => addPollOnce(poll);
    const handleVoteRecorded = () => setVotedPolls(getLocalVotedPolls());

    socket.on('lobby_poll_updated', handleLobbyUpdate);
    socket.on('poll_created', handlePollCreated);
    window.addEventListener('pulse-vote-recorded', handleVoteRecorded);
    window.addEventListener('storage', handleVoteRecorded);

    if (sharedPollId) {
      fetch(`/api/polls/${encodeURIComponent(sharedPollId)}`)
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          if (payload?.success && payload.data) addPollOnce(payload.data);
        })
        .catch(() => {});
    }

    return () => {
      socket.off('lobby_poll_updated', handleLobbyUpdate);
      socket.off('poll_created', handlePollCreated);
      window.removeEventListener('pulse-vote-recorded', handleVoteRecorded);
      window.removeEventListener('storage', handleVoteRecorded);
    };
  }, [fetchPolls, addPollOnce, sharedPollId]);

  const votedIds = useMemo(() => new Set(votedPolls.map((item) => item.pollId)), [votedPolls]);
  const totalVotes = polls.reduce((sum, poll) => sum + (Number(poll.totalVotes) || 0), 0);
  const activePollCount = polls.filter((poll) => poll.isActive !== false && (!poll.expiresAt || new Date(poll.expiresAt) > new Date())).length;

  const filteredPolls = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return polls.filter((poll) => {
      if (sharedPollId && poll._id === sharedPollId) return true;
      if (activeTab === 'voted' && !votedIds.has(poll._id)) return false;
      if (activeTab === 'active' && (poll.isActive === false || (poll.expiresAt && new Date(poll.expiresAt) <= new Date()))) return false;
      if (!query) return true;
      return poll.title?.toLocaleLowerCase().includes(query)
        || poll.options?.some((option) => option.text?.toLocaleLowerCase().includes(query));
    });
  }, [polls, activeTab, searchQuery, votedIds, sharedPollId]);

  const handleViewAll = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('poll');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setSharedPollId(null);
    setActiveTab('all');
  };

  const handlePollCreated = (poll) => {
    addPollOnce(poll);
    setActiveTab('all');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-[15%] h-96 w-96 rounded-full bg-emerald-500/[0.07] blur-3xl" />
        <div className="absolute top-[35rem] -right-48 h-96 w-96 rounded-full bg-cyan-500/[0.05] blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080c14]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="/" className="group flex min-w-0 items-center gap-3" aria-label="PulsePoll home">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-600 text-[#04140f] shadow-lg shadow-emerald-500/15 transition-transform group-hover:rotate-3">
              <Activity className="h-5 w-5" strokeWidth={2.7} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">PulsePoll</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">Realtime</span>
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:block">Fast feedback. Shared understanding.</span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block"><LiveBadge /></div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-extrabold text-[#04140f] shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#080c14]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.8} />
              <span>Create poll</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-14 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        {sharedPollId && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 text-sm text-cyan-100 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> You’re viewing a shared poll.</span>
            <button type="button" onClick={handleViewAll} className="inline-flex items-center gap-1 font-semibold text-cyan-300 hover:text-white">Back to all polls <ArrowUpRight className="h-3.5 w-3.5" /></button>
          </div>
        )}

        <section className="relative mb-8 overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-[#111b29] via-[#0f1724] to-[#0b1520] px-6 py-8 shadow-2xl shadow-black/20 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="absolute -right-8 -top-16 hidden h-72 w-72 rounded-full border border-emerald-300/[0.08] md:block" />
          <div className="absolute -right-1 top-0 hidden h-56 w-56 rounded-full border border-emerald-300/[0.08] md:block" />
          <div className="absolute right-16 top-16 hidden h-24 w-24 rounded-3xl border border-emerald-300/[0.12] bg-emerald-300/[0.03] md:block" />
          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> A more engaging way to decide
            </div>
            <h1 className="max-w-2xl text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[48px]">
              Make every opinion <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">count.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              Create a quick poll, share one link, and watch the results move together in real time. No spreadsheets or guesswork needed.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-extrabold text-[#06150f] transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                <Plus className="h-4 w-4" /> Start a poll
              </button>
              <span className="inline-flex items-center gap-2 px-2 py-2 text-xs text-slate-400"><Wifi className="h-4 w-4 text-emerald-300" /> Live results across connected devices</span>
            </div>
          </div>
        </section>

        <section aria-label="Platform overview" className="mb-9 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard icon={Layers3} label="Polls loaded" value={polls.length} detail="Questions in this view" iconClass="text-cyan-300 bg-cyan-300/10" />
          <StatCard icon={Vote} label="Votes recorded" value={totalVotes.toLocaleString()} detail="In the loaded poll set" iconClass="text-emerald-300 bg-emerald-300/10" />
          <StatCard icon={BarChart3} label="Active in view" value={activePollCount} detail="Open for new votes" iconClass="text-violet-300 bg-violet-300/10" />
        </section>

        <section aria-labelledby="poll-section-heading">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.19em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Community pulse</div>
              <h2 id="poll-section-heading" className="text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">Explore the polls</h2>
              <p className="mt-1 text-sm text-slate-500">Join the conversation and see results update as people vote.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block sm:w-64">
                <span className="sr-only">Search polls</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search a question or option…"
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0c131f] py-2.5 pl-10 pr-3 text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                />
              </label>
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#0c131f] p-1" role="group" aria-label="Filter polls">
                {filterOptions.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveTab(filter.id)}
                    aria-pressed={activeTab === filter.id}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeTab === filter.id ? 'bg-emerald-400 text-[#06150f] shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    {filter.label}{filter.id === 'voted' ? ` (${votedIds.size})` : ''}
                  </button>
                ))}
                <button type="button" onClick={() => fetchPolls({ quiet: true })} disabled={isRefreshing} className="ml-1 rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50" aria-label="Refresh polls" title="Refresh polls">
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {loadError && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError} Make sure the API server is running.</span>
              <button type="button" onClick={() => fetchPolls()} className="shrink-0 rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-bold hover:bg-rose-300/10">Try again</button>
            </div>
          )}

          {isLoading && polls.length === 0 ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]" />)}
            </div>
          ) : filteredPolls.length > 0 ? (
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
              {filteredPolls.map((poll) => <PollCard key={poll._id} initialPoll={poll} onShareToast={triggerToast} />)}
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-slate-400"><CircleHelp className="h-6 w-6" /></div>
              <h3 className="text-lg font-bold text-white">{searchQuery ? 'No matching polls' : activeTab === 'voted' ? 'Your voting journey starts here' : 'Nothing to vote on yet'}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{searchQuery ? 'Try a different keyword or clear your search.' : activeTab === 'voted' ? 'Cast a vote in any poll and it will show up here on this browser.' : 'Be the first to ask a question and invite others to weigh in.'}</p>
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery('')} className="mt-5 rounded-xl border border-white/[0.12] px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/[0.05]">Clear search</button>
              ) : (
                <button type="button" onClick={() => setIsModalOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-extrabold text-[#06150f] hover:bg-emerald-300"><Plus className="h-4 w-4" /> Create the first poll</button>
              )}
            </div>
          )}
        </section>

        <section className="mt-10 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0c131d]/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-emerald-300/[0.08] p-2 text-emerald-300"><ShieldCheck className="h-4 w-4" /></span>
            <div><p className="text-xs font-bold text-slate-200">Built for open, fast feedback</p><p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500">Voting is limited to one submission per browser token and poll. This demo does not provide identity verification; use authenticated accounts for high-stakes voting.</p></div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-white/[0.07] px-3 py-1.5 text-[10px] font-medium text-slate-500 sm:self-auto"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> React · Node.js · Socket.IO</div>
        </section>
      </main>

      <footer className="relative border-t border-white/[0.06] py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} PulsePoll. Share ideas, decide together.</span>
          <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-400" /> Real-time results powered by Socket.IO</span>
        </div>
      </footer>

      <CreatePollModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPollCreated={handlePollCreated} onToast={triggerToast} />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, iconClass }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#0d1420]/90 p-4 transition hover:border-white/[0.12] sm:p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-0.5 text-2xl font-extrabold tracking-tight text-white tabular-nums">{value}</p><p className="mt-0.5 text-[10px] text-slate-600">{detail}</p></div>
    </article>
  );
}
