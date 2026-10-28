import { z } from 'zod';
import { castVote, createPoll as savePoll, getPollById as findPoll, listPolls } from '../repositories/pollRepository.js';

export const createPollSchema = z.object({
  title: z.string({ required_error: 'A poll question is required.' })
    .trim().min(3, 'The question must contain at least 3 characters.')
    .max(240, 'The question cannot exceed 240 characters.'),
  options: z.array(
    z.union([
      z.string().trim().min(1, 'Options cannot be empty.').max(120, 'Options cannot exceed 120 characters.'),
      z.object({ text: z.string().trim().min(1, 'Options cannot be empty.').max(120) }),
    ]),
  ).min(2, 'Add at least 2 options.').max(10, 'A maximum of 10 options is allowed.'),
  durationMinutes: z.coerce.number().positive().max(43200, 'Poll duration cannot exceed 30 days.').nullable().optional(),
});

export const createPoll = async (req, res, next) => {
  try {
    const parsed = createPollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Please check the poll details.',
        errors: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      });
    }

    const { title, options, durationMinutes } = parsed.data;
    const normalizedOptions = options.map((option) => typeof option === 'string' ? option.trim() : option.text.trim());
    const uniqueOptions = new Set(normalizedOptions.map((option) => option.toLocaleLowerCase()));
    if (uniqueOptions.size !== normalizedOptions.length) {
      return res.status(400).json({ success: false, message: 'Each poll option must be unique.' });
    }

    const poll = await savePoll({ title, options: normalizedOptions, durationMinutes });
    req.app.get('io')?.emit('poll_created', poll);
    return res.status(201).json({ success: true, data: poll });
  } catch (error) {
    return next(error);
  }
};

export const getPolls = async (req, res, next) => {
  try {
    const result = await listPolls({ page: req.query.page, limit: req.query.limit });
    return res.status(200).json({ success: true, ...result, count: result.data.length });
  } catch (error) {
    return next(error);
  }
};

export const getPollById = async (req, res, next) => {
  try {
    const voterHash = req.get('x-voter-hash') || req.query.voterHash;
    const poll = await findPoll(req.params.id, voterHash);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found.' });
    return res.status(200).json({ success: true, data: poll });
  } catch (error) {
    return next(error);
  }
};

export const submitVote = async (req, res, next) => {
  try {
    const { optionId, voterHash } = req.body || {};
    if (typeof optionId !== 'string' || !optionId.trim()) {
      return res.status(400).json({ success: false, message: 'A valid option is required.' });
    }
    const token = voterHash || req.get('x-voter-hash');
    const result = await castVote({ pollId: req.params.id, optionId, voterHash: token });
    if (!result.success) {
      const status = result.code === 'POLL_NOT_FOUND' ? 404 : result.code === 'POLL_CLOSED' ? 409 : result.code === 'ALREADY_VOTED' ? 409 : 400;
      return res.status(status).json(result);
    }
    req.app.get('io')?.to(`poll:${req.params.id}`).emit('poll_updated', {
      pollId: req.params.id,
      poll: result.poll,
      updatedOptionId: optionId,
      timestamp: new Date().toISOString(),
    });
    req.app.get('io')?.emit('lobby_poll_updated', {
      pollId: req.params.id,
      totalVotes: result.poll.totalVotes,
      options: result.poll.options,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
