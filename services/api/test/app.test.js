import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';

const userId = '00000000-0000-4000-8000-000000000001';
const result = (rows) => ({ rows, rowCount: rows.length });

async function withApi(t, queries, run) {
 const queue = [...queries];
 t.mock.method(pool, 'query', async (sql, params) => {
  if (sql === 'SELECT id FROM users WHERE id=$1') {
   assert.deepEqual(params, [userId]);
   return result([{ id: userId }]);
  }
  const expected = queue.shift();
  assert.ok(expected, `Unexpected query: ${sql}`);
  assert.match(sql, expected.sql);
  assert.deepEqual(params, expected.params);
  return result(expected.rows);
 });
 const server = createApp().listen(0, '127.0.0.1');
 await once(server, 'listening');
 try {
  await run(async (path, options = {}) => {
   const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
    ...options, headers: { 'X-Explore-User': userId, 'Content-Type': 'application/json' }
   });
   return { status: response.status, body: await response.json() };
  });
  assert.equal(queue.length, 0, 'All expected database queries executed');
 } finally {
  await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
 }
}

test('Quiz list uses the authenticated user and returns completion state', async t => {
 const rows = [{ id: 'quiz-1', title: 'Quiz', completed: true }];
 await withApi(t, [{ sql: /FROM quizzes q LEFT JOIN quiz_submissions/, params: [userId], rows }], async request => {
  assert.deepEqual(await request('/quizzes'), { status: 200, body: rows });
 });
});

test('Progress uses the authenticated user for XP, preferences and completed quizzes', async t => {
 const preferences = [{ code: 'nature', score: 1, observations: 1 }];
 await withApi(t, [
  { sql: /FROM xp_events/, params: [userId], rows: [{ xp: 200 }] },
  { sql: /FROM user_preferences/, params: [userId], rows: preferences },
  { sql: /FROM quiz_submissions/, params: [userId], rows: [{ quiz_id: 'quiz-1' }] }
 ], async request => {
  assert.deepEqual(await request('/me/progress'), { status: 200, body: {
   xp: 200, level: 2, completedQuizIds: ['quiz-1'], preferences
  }});
 });
});

test('Recommendations use the authenticated user and preserve baseline fallback', async t => {
 t.mock.method(globalThis, 'fetch', globalThis.fetch);
 const httpFetch = globalThis.fetch;
 t.mock.method(globalThis, 'fetch', async (url, options) => {
  if (String(url).endsWith('/predict')) throw new Error('ML unavailable');
  return httpFetch(url, options);
 });
 const place = { id: 'place-1', features: { nature: 1 } };
 await withApi(t, [
  { sql: /FROM user_preferences/, params: [userId], rows: [{ feature_code: 'nature', score: 1 }] },
  { sql: /FROM places p/, params: undefined, rows: [place] }
 ], async request => {
  assert.deepEqual(await request('/recommendations'), { status: 200, body: {
   source: 'baseline', items: [{ ...place, matchScore: 1, feedback: null }]
  }});
 });
});

test('Quiz detail still groups questions and options', async t => {
 await withApi(t, [
  { sql: /FROM quizzes WHERE/, params: ['quiz-1'], rows: [{ id: 'quiz-1', title: 'Quiz' }] },
  { sql: /FROM questions q JOIN options/, params: ['quiz-1'], rows: [
   { questionId: 'q1', prompt: 'Question?', optionId: 'o1', label: 'Yes' }
  ] }
 ], async request => {
  assert.deepEqual(await request('/quizzes/quiz-1'), { status: 200, body: {
   id: 'quiz-1', title: 'Quiz', questions: [{ id: 'q1', prompt: 'Question?', options: [{ id: 'o1', label: 'Yes' }] }]
  }});
 });
});

test('Quiz submission preserves user scope, XP and transaction handling', async t => {
 const answers = [{ questionId: 'q1', optionId: 'o1' }];
 const queries = [
  [/^BEGIN$/, undefined, []],
  [/FROM quizzes WHERE/, ['quiz-1'], [{ id: 'quiz-1', xp_reward: 50 }]],
  [/FROM questions q JOIN options/, ['quiz-1'], [{ id: 'q1', options: ['o1'] }]],
  [/INSERT INTO quiz_submissions/, [userId, 'quiz-1'], [{ quiz_id: 'quiz-1' }]],
  [/INSERT INTO user_answers/, [userId, 'q1', 'o1'], []],
  [/INSERT INTO user_preferences/, [userId], []],
  [/INSERT INTO xp_events/, [userId, 'quiz:quiz-1', 50], []],
  [/FROM xp_events/, [userId], [{ xp: 50 }]],
  [/^COMMIT$/, undefined, []]
 ];
 let released = false;
 t.mock.method(pool, 'connect', async () => ({
  query: async (sql, params) => {
   const expected = queries.shift();
   assert.ok(expected, `Unexpected transaction query: ${sql}`);
   assert.match(sql, expected[0]);
   assert.deepEqual(params, expected[1]);
   return result(expected[2]);
  },
  release: () => { released = true; }
 }));
 await withApi(t, [], async request => {
  assert.deepEqual(await request('/quizzes/quiz-1/submit', { method: 'POST', body: JSON.stringify({ answers }) }), {
   status: 201, body: { completed: true, xp: 50, level: 1, earnedXp: 50 }
  });
 });
 assert.equal(queries.length, 0);
 assert.equal(released, true);
});
