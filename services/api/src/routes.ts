import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js';
import { requireUser } from './auth.js';
import { answerCreateSchema, sessionCreateSchema, uuid } from './schemas.js';

export const api = Router();
api.use(requireUser);

/**
 * @openapi
 * /api/v1/topics:
 *   get:
 *     summary: List active topics
 *     parameters:
 *       - $ref: '#/components/parameters/DevUser'
 *     responses:
 *       '200':
 *         description: Active topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topics:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Topic' }
 *       '401': { description: Unauthorized }
 */
api.get('/topics', async (_req, res, next) => {
  try {
    const result = await pool.query(`SELECT id, canonical_key AS "canonicalKey", display_name AS "displayName" FROM topics WHERE status = 'active' ORDER BY display_name`);
    res.json({ topics: result.rows });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/v1/topics/recommendations:
 *   get:
 *     summary: Recommend three topics using deterministic fallback (ML not yet integrated)
 *     parameters:
 *       - $ref: '#/components/parameters/DevUser'
 *     responses:
 *       '200': { description: Topics and recommendation batch }
 *       '401': { description: Unauthorized }
 */
api.get('/topics/recommendations', async (_req, res, next) => {
  const userId = res.locals.userId as string;
  try {
    const result = await pool.query(`SELECT id, canonical_key AS "canonicalKey", display_name AS "displayName" FROM topics WHERE status = 'active' ORDER BY canonical_key LIMIT 3`);
    const batchId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [i, t] of result.rows.entries()) {
        await client.query('INSERT INTO topic_impressions (id, user_id, topic_id, batch_id, display_position, strategy) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), userId, t.id, batchId, i + 1, 'baseline-v0']);
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
    res.json({ batchId, strategy: 'baseline-v0', topics: result.rows });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /api/v1/quiz/sessions:
 *   post:
 *     summary: Start quiz session with topic
 *     parameters:
 *       - $ref: '#/components/parameters/DevUser'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topicId]
 *             properties:
 *               topicId: { type: string, format: uuid }
 *     responses:
 *       '201': { description: Created quiz session with questions }
 *       '400': { description: Invalid input }
 *       '404': { description: Topic unavailable }
 */
api.post('/quiz/sessions', async (req, res, next) => {
  const input = sessionCreateSchema.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: input.error.message } }); return; }
  const userId = res.locals.userId as string;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const topic = await client.query("SELECT id FROM topics WHERE id=$1 AND status='active'", [input.data.topicId]);
    if (!topic.rowCount) { await client.query('ROLLBACK'); res.status(404).json({ error: { code: 'TOPIC_NOT_FOUND', message: 'Topic unavailable' } }); return; }
    const id = randomUUID();
    await client.query('INSERT INTO quiz_sessions (id,user_id,topic_id,status) VALUES ($1,$2,$3,$4)', [id,userId,input.data.topicId,'in_progress']);
    const q = await client.query(`SELECT id,prompt,question_type AS "questionType" FROM questions WHERE topic_id=$1 AND status='active' ORDER BY id LIMIT 5`, [input.data.topicId]);
    for (const [i, x] of q.rows.entries()) {
      await client.query('INSERT INTO session_questions (id,session_id,question_id,position) VALUES ($1,$2,$3,$4)', [randomUUID(),id,x.id,i+1]);
    }
    await client.query('COMMIT');
    res.status(201).json({ id, topicId: input.data.topicId, status: 'in_progress', questions: q.rows });
  } catch (e) { await client.query('ROLLBACK'); next(e); }
  finally { client.release(); }
});

/**
 * @openapi
 * /api/v1/quiz/sessions/{id}/answers:
 *   post:
 *     summary: Save answer and outbox event in one transaction
 *     parameters:
 *       - $ref: '#/components/parameters/DevUser'
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionId, answer, idempotencyKey]
 *             properties:
 *               questionId: { type: string, format: uuid }
 *               answer:
 *                 oneOf:
 *                   - { type: string, minLength: 1, maxLength: 2000 }
 *                   - { type: array, items: { type: string }, minItems: 1, maxItems: 10 }
 *               idempotencyKey: { type: string, format: uuid }
 *     responses:
 *       '201': { description: Answer persisted }
 *       '200': { description: Previously persisted response to same idempotency key }
 *       '400': { description: Invalid input }
 *       '404': { description: Session/question not found }
 *       '409': { description: Conflicting repeated submission }
 */
api.post('/quiz/sessions/:id/answers', async (req, res, next) => {
  const sessionId = uuid.safeParse(req.params.id);
  const input = answerCreateSchema.safeParse(req.body);
  if (!sessionId.success || !input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid session ID or answer payload' } }); return; }
  const userId = res.locals.userId as string;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const session = await client.query("SELECT s.id FROM quiz_sessions s JOIN session_questions sq ON sq.session_id=s.id WHERE s.id=$1 AND s.user_id=$2 AND s.status='in_progress' AND sq.question_id=$3", [sessionId.data,userId,input.data.questionId]);
    if (!session.rowCount) { await client.query('ROLLBACK'); res.status(404).json({ error: { code: 'SESSION_QUESTION_NOT_FOUND', message: 'Active session/question not found' } }); return; }
    const existing = await client.query('SELECT id,question_id,answer_json FROM answers WHERE user_id=$1 AND idempotency_key=$2', [userId,input.data.idempotencyKey]);
    if (existing.rowCount) {
      const same = existing.rows[0].question_id === input.data.questionId && JSON.stringify(existing.rows[0].answer_json) === JSON.stringify(input.data.answer);
      await client.query('COMMIT');
      res.status(same ? 200 : 409).json(same ? { answerId: existing.rows[0].id, repeated: true } : { error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Key already used for different answer' } }); return;
    }
    const answerId = randomUUID();
    await client.query('INSERT INTO answers (id,user_id,session_id,question_id,answer_json,idempotency_key) VALUES ($1,$2,$3,$4,$5,$6)', [answerId,userId,sessionId.data,input.data.questionId,JSON.stringify(input.data.answer),input.data.idempotencyKey]);
    await client.query('INSERT INTO outbox_events (id,aggregate_type,aggregate_id,event_type,payload) VALUES ($1,$2,$3,$4,$5)', [randomUUID(),'answer',answerId,'answer.created',JSON.stringify({ answerId, userId })]);
    await client.query('COMMIT');
    res.status(201).json({ answerId, repeated: false, processingStatus: 'queued' });
  } catch (e: unknown) {
    await client.query('ROLLBACK');
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') { res.status(409).json({error:{code:'ANSWER_EXISTS',message:'Question already answered'}}); return; }
    next(e);
  } finally { client.release(); }
});
