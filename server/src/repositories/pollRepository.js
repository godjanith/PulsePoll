import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { Poll } from '../models/Poll.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(__dirname, '../../data');
const dataFile = process.env.POLL_DATA_FILE || path.join(dataDirectory, 'polls.json');
const seedFile = path.join(dataDirectory, 'polls.seed.json');
let useMongoStorage = false;

export const setMongoStorageEnabled = (enabled) => { useMongoStorage = Boolean(enabled); };
export const isMongoStorageEnabled = () => useMongoStorage;
export const isMongoConnected = () => useMongoStorage && mongoose.connection.readyState === 1;

function ensureFileStore() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) {
    const seed = fs.existsSync(seedFile) ? fs.readFileSync(seedFile, 'utf8') : '[]';
    fs.writeFileSync(dataFile, seed, 'utf8');
  }
}

function readFilePolls() {
  ensureFileStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Storage] The local poll file is invalid JSON:', error.message);
    throw new Error('The local poll data file could not be read. Check server/data/polls.json.');
  }
}

function writeFilePolls(polls) {
  ensureFileStore();
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(polls, null, 2), 'utf8');
  fs.renameSync(temporaryFile, dataFile);
}

function toPublicPoll(source, voterHash) {
  if (!source) return null;
  const raw = typeof source.toObject === 'function'
    ? source.toObject({ virtuals: true })
    : JSON.parse(JSON.stringify(source));

  const voterHashes = Array.isArray(raw.voterHashes) ? raw.voterHashes : [];
  const options = Array.isArray(raw.options) ? raw.options : [];
  const expiresAt = raw.expiresAt ? new Date(raw.expiresAt) : null;

  delete raw.voterHashes;
  raw.options = options;
  raw.totalVotes = options.reduce((sum, option) => sum + (Number(option.votes) || 0), 0);
  raw.isExpired = Boolean(expiresAt && expiresAt.getTime() <= Date.now());
  if (voterHash) raw.hasVoted = voterHashes.includes(voterHash);
  return raw;
}

function hashVoterToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeOption(text) {
  return {
    _id: `opt-${crypto.randomUUID()}`,
    text: text.trim(),
    votes: 0,
  };
}

export async function listPolls({ page = 1, limit = 50 } = {}) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  if (isMongoStorageEnabled()) {
    const [polls, total] = await Promise.all([
      Poll.find().sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean({ virtuals: true }),
      Poll.countDocuments(),
    ]);
    return {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
      data: polls.map((poll) => toPublicPoll(poll)),
    };
  }

  const allPolls = readFilePolls().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return {
    page: safePage,
    limit: safeLimit,
    total: allPolls.length,
    pages: Math.max(1, Math.ceil(allPolls.length / safeLimit)),
    data: allPolls.slice(skip, skip + safeLimit).map((poll) => toPublicPoll(poll)),
  };
}

export async function getPollById(id, voterHash) {
  if (isMongoStorageEnabled()) {
    if (!mongoose.isValidObjectId(id)) return null;
    const poll = await Poll.findById(id).select('+voterHashes');
    const voterKey = typeof voterHash === 'string' && voterHash.length >= 8 && voterHash.length <= 256
      ? hashVoterToken(voterHash)
      : null;
    return poll ? toPublicPoll(poll, voterKey) : null;
  }

  const poll = readFilePolls().find((item) => item._id === id);
  const voterKey = typeof voterHash === 'string' && voterHash.length >= 8 && voterHash.length <= 256
    ? hashVoterToken(voterHash)
    : null;
  return poll ? toPublicPoll(poll, voterKey) : null;
}

export async function createPoll({ title, options, durationMinutes = null }) {
  const expiresAt = durationMinutes && Number(durationMinutes) > 0
    ? new Date(Date.now() + Number(durationMinutes) * 60_000)
    : null;

  if (isMongoStorageEnabled()) {
    const poll = await Poll.create({
      title: title.trim(),
      options: options.map((option) => ({ text: option.trim(), votes: 0 })),
      expiresAt,
    });
    return toPublicPoll(poll);
  }

  const polls = readFilePolls();
  const now = new Date().toISOString();
  const poll = {
    _id: `poll-${crypto.randomUUID()}`,
    title: title.trim(),
    options: options.map((option) => makeOption(option)),
    voterHashes: [],
    isActive: true,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    createdAt: now,
    updatedAt: now,
  };
  polls.unshift(poll);
  writeFilePolls(polls);
  return toPublicPoll(poll);
}

function diagnoseFailedVote(poll, optionId, voterHash) {
  if (!poll) return { success: false, code: 'POLL_NOT_FOUND', message: 'This poll could not be found.' };
  if (poll.isActive === false || (poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now())) {
    return { success: false, code: 'POLL_CLOSED', message: 'This poll is closed and no longer accepts votes.' };
  }
  if ((poll.voterHashes || []).includes(voterHash)) {
    return { success: false, code: 'ALREADY_VOTED', message: 'A vote has already been recorded for this browser.' };
  }
  if (!(poll.options || []).some((option) => String(option._id) === String(optionId))) {
    return { success: false, code: 'INVALID_OPTION', message: 'Please select a valid poll option.' };
  }
  return null;
}

export async function castVote({ pollId, optionId, voterHash }) {
  if (!voterHash || typeof voterHash !== 'string' || voterHash.length < 8 || voterHash.length > 256) {
    return { success: false, code: 'BAD_VOTER_ID', message: 'A valid voter token is required.' };
  }

  const voterKey = hashVoterToken(voterHash);

  if (isMongoStorageEnabled()) {
    if (!mongoose.isValidObjectId(pollId)) {
      return { success: false, code: 'POLL_NOT_FOUND', message: 'This poll could not be found.' };
    }
    if (!mongoose.isValidObjectId(optionId)) {
      return { success: false, code: 'INVALID_OPTION', message: 'Please select a valid poll option.' };
    }
    const updatedPoll = await Poll.findOneAndUpdate(
      {
        _id: pollId,
        isActive: true,
        voterHashes: { $ne: voterKey },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        'options._id': optionId,
      },
      {
        $inc: { 'options.$.votes': 1 },
        $push: { voterHashes: voterKey },
      },
      { new: true, runValidators: true },
    );

    if (updatedPoll) return { success: true, poll: toPublicPoll(updatedPoll) };
    const existingPoll = await Poll.findById(pollId).select('+voterHashes');
    return diagnoseFailedVote(existingPoll?.toObject({ virtuals: true }) || null, optionId, voterKey)
      || { success: false, code: 'VOTE_FAILED', message: 'The vote could not be recorded. Please try again.' };
  }

  const polls = readFilePolls();
  const poll = polls.find((item) => item._id === pollId);
  const failure = diagnoseFailedVote(poll, optionId, voterKey);
  if (failure) return failure;

  const option = poll.options.find((item) => String(item._id) === String(optionId));
  poll.voterHashes = Array.isArray(poll.voterHashes) ? poll.voterHashes : [];
  poll.voterHashes.push(voterKey);
  option.votes = (Number(option.votes) || 0) + 1;
  poll.updatedAt = new Date().toISOString();
  writeFilePolls(polls);
  return { success: true, poll: toPublicPoll(poll) };
}
