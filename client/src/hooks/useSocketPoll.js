import { useCallback, useEffect, useRef, useState } from 'react';
import socketService from '../services/socket.js';
import { getVoterFingerprint, recordLocalVote, hasUserVotedLocally } from '../utils/fingerprint.js';

export const useSocketPoll = (initialPoll) => {
  const [poll, setPoll] = useState(initialPoll || null);
  const [liveViewers, setLiveViewers] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);
  const pollId = initialPoll?._id || initialPoll?.id;
  const localVote = pollId ? hasUserVotedLocally(pollId) : null;
  const [userVotedOptionId, setUserVotedOptionId] = useState(localVote?.optionId || null);
  const previousPollRef = useRef(initialPoll || null);
  const pendingVoteRef = useRef(false);

  useEffect(() => {
    if (!initialPoll) return;
    setPoll(initialPoll);
    previousPollRef.current = initialPoll;
    const record = hasUserVotedLocally(initialPoll._id);
    setUserVotedOptionId((current) => current || record?.optionId || null);
  }, [initialPoll]);

  useEffect(() => {
    if (!pollId) return undefined;
    const socket = socketService.getSocket();
    const joinRoom = () => socket.emit('join_poll', { pollId });
    const handlePollUpdated = (payload = {}) => {
      if (payload.pollId === pollId && payload.poll) {
        setPoll(payload.poll);
        previousPollRef.current = payload.poll;
      }
    };
    const handleViewerCount = ({ pollId: updatedId, viewers } = {}) => {
      if (updatedId === pollId) setLiveViewers(Math.max(0, Number(viewers) || 0));
    };
    const handleVoteError = (error = {}) => {
      setVoteError(error.message || 'The vote could not be submitted. Please try again.');
    };

    socket.on('connect', joinRoom);
    socket.on('poll_updated', handlePollUpdated);
    socket.on('viewer_count', handleViewerCount);
    socket.on('vote_error', handleVoteError);
    if (socket.connected) joinRoom();

    return () => {
      if (socket.connected) socket.emit('leave_poll', { pollId });
      socket.off('connect', joinRoom);
      socket.off('poll_updated', handlePollUpdated);
      socket.off('viewer_count', handleViewerCount);
      socket.off('vote_error', handleVoteError);
    };
  }, [pollId]);

  const castVote = useCallback((optionId) => {
    if (!poll || pendingVoteRef.current || userVotedOptionId || poll.isActive === false) return;
    if (poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now()) {
      setVoteError('This poll has ended and no longer accepts votes.');
      return;
    }

    const voterHash = getVoterFingerprint();
    const targetOption = poll.options?.find((option) => String(option._id) === String(optionId));
    if (!targetOption) {
      setVoteError('That option is not available. Refresh the poll and try again.');
      return;
    }

    pendingVoteRef.current = true;
    setIsVoting(true);
    setVoteError(null);
    previousPollRef.current = poll;
    setPoll((current) => {
      if (!current) return current;
      return {
        ...current,
        options: current.options.map((option) => String(option._id) === String(optionId)
          ? { ...option, votes: (Number(option.votes) || 0) + 1 }
          : option),
        totalVotes: (Number(current.totalVotes) || 0) + 1,
      };
    });
    setUserVotedOptionId(optionId);

    const socket = socketService.getSocket();
    socket.timeout(10000).emit('cast_vote', { pollId: poll._id, optionId, voterHash }, (timeoutError, response) => {
      pendingVoteRef.current = false;
      setIsVoting(false);
      if (timeoutError) {
        setPoll(previousPollRef.current);
        setUserVotedOptionId(null);
        setVoteError('The server did not respond. Check your connection and try again.');
        return;
      }
      if (response?.success) {
        recordLocalVote(poll._id, optionId);
        if (response.poll) {
          setPoll(response.poll);
          previousPollRef.current = response.poll;
        }
      } else {
        setPoll(previousPollRef.current);
        setUserVotedOptionId(null);
        setVoteError(response?.message || 'The vote could not be recorded. Please try again.');
      }
    });
  }, [poll, userVotedOptionId]);

  return {
    poll,
    liveViewers,
    castVote,
    isVoting,
    voteError,
    hasVoted: Boolean(userVotedOptionId),
    userVotedOptionId,
  };
};
