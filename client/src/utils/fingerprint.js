const VOTER_KEY = 'pulse_voter_uuid';
const VOTES_KEY = 'pulse_voted_polls';

export const getVoterFingerprint = () => {
  try {
    let fingerprint = window.localStorage.getItem(VOTER_KEY);
    if (!fingerprint) {
      fingerprint = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `voter_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      window.localStorage.setItem(VOTER_KEY, fingerprint);
    }
    return fingerprint;
  } catch {
    // Local storage can be disabled; this token only provides best-effort deduplication.
    return `session_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  }
};

export const getLocalVotedPolls = () => {
  try {
    const raw = window.localStorage.getItem(VOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.pollId === 'string') : [];
  } catch {
    return [];
  }
};

export const recordLocalVote = (pollId, optionId) => {
  try {
    const votes = getLocalVotedPolls();
    if (!votes.some((vote) => vote.pollId === pollId)) {
      votes.push({ pollId, optionId, votedAt: new Date().toISOString() });
      window.localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
      window.dispatchEvent(new Event('pulse-vote-recorded'));
    }
  } catch (error) {
    console.warn('Could not remember this vote in local storage:', error.message);
  }
};

export const hasUserVotedLocally = (pollId) => getLocalVotedPolls().find((vote) => vote.pollId === pollId) || null;
