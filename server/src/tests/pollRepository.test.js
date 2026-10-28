import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pulsepoll-test-'));
process.env.POLL_DATA_FILE = path.join(testDirectory, 'polls.json');
const repository = await import('../repositories/pollRepository.js');

 test('creates a poll and stores option IDs, zero votes, and safe public fields', async () => {
  const poll = await repository.createPoll({
    title: 'Which feature should we ship next?',
    options: ['Search', 'Poll categories'],
    durationMinutes: null,
  });

  assert.match(poll._id, /^poll-/);
  assert.equal(poll.title, 'Which feature should we ship next?');
  assert.equal(poll.options.length, 2);
  assert.equal(poll.totalVotes, 0);
  assert.equal(poll.options[0].votes, 0);
  assert.equal(Object.hasOwn(poll, 'voterHashes'), false);

  const reloaded = await repository.getPollById(poll._id);
  assert.equal(reloaded.title, poll.title);
});

test('records exactly one vote per voter token and updates live totals', async () => {
  const poll = await repository.createPoll({
    title: 'Do the realtime results work?',
    options: ['Yes', 'Not yet'],
  });
  const firstVote = await repository.castVote({
    pollId: poll._id,
    optionId: poll.options[0]._id,
    voterHash: 'test-voter-token-001',
  });

  assert.equal(firstVote.success, true);
  assert.equal(firstVote.poll.totalVotes, 1);
  assert.equal(firstVote.poll.options[0].votes, 1);

  const duplicateVote = await repository.castVote({
    pollId: poll._id,
    optionId: poll.options[1]._id,
    voterHash: 'test-voter-token-001',
  });
  assert.equal(duplicateVote.success, false);
  assert.equal(duplicateVote.code, 'ALREADY_VOTED');

  const secondVoter = await repository.castVote({
    pollId: poll._id,
    optionId: poll.options[1]._id,
    voterHash: 'test-voter-token-002',
  });
  assert.equal(secondVoter.success, true);
  assert.equal(secondVoter.poll.totalVotes, 2);
  assert.equal(secondVoter.poll.options[1].votes, 1);
});

test('rejects invalid tokens and expired polls', async () => {
  const poll = await repository.createPoll({ title: 'An expiring poll', options: ['A', 'B'], durationMinutes: 1 });
  const invalidToken = await repository.castVote({ pollId: poll._id, optionId: poll.options[0]._id, voterHash: 'short' });
  assert.equal(invalidToken.success, false);
  assert.equal(invalidToken.code, 'BAD_VOTER_ID');

  const data = JSON.parse(fs.readFileSync(process.env.POLL_DATA_FILE, 'utf8'));
  const stored = data.find((item) => item._id === poll._id);
  stored.expiresAt = new Date(Date.now() - 60_000).toISOString();
  fs.writeFileSync(process.env.POLL_DATA_FILE, JSON.stringify(data, null, 2));

  const expired = await repository.castVote({ pollId: poll._id, optionId: poll.options[0]._id, voterHash: 'test-voter-token-003' });
  assert.equal(expired.success, false);
  assert.equal(expired.code, 'POLL_CLOSED');
});

test.after(() => {
  fs.rmSync(testDirectory, { recursive: true, force: true });
});
