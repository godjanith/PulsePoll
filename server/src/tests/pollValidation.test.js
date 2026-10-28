import test from 'node:test';
import assert from 'node:assert/strict';
import { createPollSchema } from '../controllers/pollController.js';

test('accepts a valid poll with an optional expiry', () => {
  const result = createPollSchema.safeParse({
    title: 'Which feature should we build next?',
    options: ['Live summaries', 'Custom themes'],
    durationMinutes: 60,
  });
  assert.equal(result.success, true);
});

test('rejects too few choices, too many choices, and excessively long durations', () => {
  assert.equal(createPollSchema.safeParse({ title: 'Choose an option', options: ['Only one'] }).success, false);
  assert.equal(createPollSchema.safeParse({ title: 'Choose an option', options: Array.from({ length: 11 }, (_, index) => `Option ${index}`) }).success, false);
  assert.equal(createPollSchema.safeParse({ title: 'Choose an option', options: ['A', 'B'], durationMinutes: 43201 }).success, false);
});

test('rejects blank and excessively long poll questions', () => {
  assert.equal(createPollSchema.safeParse({ title: '  ', options: ['A', 'B'] }).success, false);
  assert.equal(createPollSchema.safeParse({ title: 'x'.repeat(241), options: ['A', 'B'] }).success, false);
});
