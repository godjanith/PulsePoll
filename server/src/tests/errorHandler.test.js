import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('does not expose internal error messages or stack traces for server errors', () => {
  const response = mockResponse();
  const original = console.error;
  console.error = () => {};
  try {
    errorHandler({ status: 500, message: 'secret database URI', stack: 'private stack trace' }, {}, response, () => {});
  } finally {
    console.error = original;
  }
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { success: false, message: 'An unexpected server error occurred.' });
  assert.equal(JSON.stringify(response.body).includes('private stack trace'), false);
  assert.equal(JSON.stringify(response.body).includes('secret database URI'), false);
});

test('returns a safe 400 response for malformed JSON bodies', () => {
  const response = mockResponse();
  const original = console.error;
  console.error = () => {};
  try {
    errorHandler({ type: 'entity.parse.failed', status: 400, message: 'raw parser detail' }, {}, response, () => {});
  } finally {
    console.error = original;
  }
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'The request body must contain valid JSON.');
});

test('does not reflect arbitrary request paths in 404 responses', () => {
  const response = mockResponse();
  notFoundHandler({ method: 'GET', originalUrl: '/bad?token=do-not-reflect' }, response);
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.message, 'The requested endpoint was not found.');
  assert.equal(JSON.stringify(response.body).includes('do-not-reflect'), false);
});
