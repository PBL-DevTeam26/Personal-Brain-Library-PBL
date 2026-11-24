import { isDeepStrictEqual } from 'node:util';
import { Router } from 'express';
import { pool } from './db.js';
import { pilotCatalog } from './pilot-data.js';
import {
  PILOT, TOTAL, catalogProblems, definition, preferenceProfile, quizAnswers, selectPilotPlaces,
} from './pilot-domain.js';

class PilotError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function pilotIsOpen() {
  return process.env.PILOT2_OPEN === '1';
}

export async function getDefinition(db) {
  const { rows: [row] } = await db.query('SELECT definition FROM pilot_versions WHERE id=$1', [PILOT]);
  if (!isDeepStrictEqual(row?.definition, definition)) throw new PilotError(503, 'Pilotversionen er ikke klargjort.');
  return row.definition;
}

async function participant(db, userId, lock = false) {
  const { rows: [row] } = await db.query(`SELECT * FROM pilot_participants
    WHERE version=$1 AND user_id=$2 ${lock ? 'FOR UPDATE' : ''}`, [PILOT, userId]);
  return row;
}

function completeQuizzes(quizzes, saved) {
  return quizzes.every(quiz => Object.hasOwn(saved, quiz.id));
}

function requireConsent(person) {
  if (!person) throw new PilotError(409, 'Giv samtykke, før du fortsætter.');
}

async function state(db, config, userId) {
  const person = await participant(db, userId);
  const saved = person?.quiz_answers ?? {};
  const completedQuizIds = Object.keys(saved);
  const quizzes = config.quizzes.map(quiz => ({ ...quiz, questions: quiz.questions.map(question => ({
    ...question, options: question.options.map(({ id, label }) => ({ id, label })),
  })) }));
  const base = { version: PILOT, consent: config.consent, consented: Boolean(person), quizzes, completedQuizIds };
  if (!person || !completeQuizzes(config.quizzes, saved)) return base;
  const { rows } = await db.query(`SELECT a.position, a.response, p.name, p.kind, p.description
    FROM pilot_assignments a JOIN pilot_places p USING (version,place_id)
    WHERE a.version=$1 AND a.user_id=$2 ORDER BY a.position`, [PILOT, userId]);
  if (rows.length !== TOTAL) throw new PilotError(503, 'Stedudvalget mangler. Kontakt forsøgslederen.');
  const next = rows.find(row => row.response === null);
  return { ...base, preferences: person.preferences, total: TOTAL, answered: rows.filter(row => row.response).length,
    nextPlace: next ? { position: next.position, name: next.name, kind: next.kind, description: next.description } : null };
}

async function transact(action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function pilotRouter() {
  const router = Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!pilotIsOpen()) return res.status(503).json({ error: { message: 'Pilot 2 er ikke åbnet for deltagelse.' } });
    next();
  });

  router.get('/', async (req, res) => res.json(await state(pool, await getDefinition(pool), req.userId)));

  router.post('/consent', async (req, res) => {
    if (req.body?.accepted !== true || req.body?.version !== PILOT) throw new PilotError(400, 'Bekræft samtykke til den viste pilotversion.');
    await transact(async db => {
      await getDefinition(db);
      // Serialize duplicate enrollment requests, including the initial assignment.
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.userId]);
      if (await participant(db, req.userId)) return;
      const { rows: [legacy] } = await db.query(`SELECT EXISTS(SELECT FROM quiz_submissions WHERE user_id=$1)
        OR EXISTS(SELECT FROM place_feedback WHERE user_id=$1) AS used`, [req.userId]);
      if (legacy.used) throw new PilotError(409, 'Opret en frisk deltagerprofil til Pilot 2.');
      const catalog = await pilotCatalog(db);
      const problems = catalogProblems(catalog);
      if (problems.length) throw new PilotError(503, 'Pilotens stedudvalg har ikke bestået kontrollen.');
      const places = selectPilotPlaces(catalog, req.userId);
      await db.query('INSERT INTO pilot_participants(version,user_id) VALUES($1,$2)', [PILOT, req.userId]);
      await db.query(`INSERT INTO pilot_assignments(version,user_id,position,place_id)
        SELECT $1,$2,ordinality,place_id FROM unnest($3::uuid[]) WITH ORDINALITY AS picked(place_id,ordinality)`,
      [PILOT, req.userId, places.map(place => place.place_id)]);
    });
    res.json(await state(pool, await getDefinition(pool), req.userId));
  });

  router.put('/quizzes/:id', async (req, res) => {
    const config = await getDefinition(pool);
    const quiz = config.quizzes.find(quiz => quiz.id === req.params.id);
    if (!quiz) throw new PilotError(404, 'Quizzen findes ikke i Pilot 2.');
    const answers = quizAnswers(quiz, req.body?.answers);
    if (!answers) throw new PilotError(400, 'Vælg ét gyldigt svar til hvert spørgsmål.');
    await transact(async db => {
      const person = await participant(db, req.userId, true);
      requireConsent(person);
      const previous = person.quiz_answers[quiz.id];
      if (isDeepStrictEqual(previous, answers)) return;
      if (previous) throw new PilotError(409, 'Quizzen er allerede gemt for denne deltager.');
      const recorded = { ...person.quiz_answers, [quiz.id]: answers };
      await db.query('UPDATE pilot_participants SET quiz_answers=$3, preferences=$4 WHERE version=$1 AND user_id=$2',
        [PILOT, req.userId, recorded, preferenceProfile(config.quizzes, recorded)]);
    });
    res.json(await state(pool, config, req.userId));
  });

  router.put('/ratings/:position', async (req, res) => {
    const position = Number(req.params.position);
    const response = req.body?.response;
    if (!Number.isInteger(position) || position < 1 || position > TOTAL || !['yes', 'no', 'skip'].includes(response)) {
      throw new PilotError(400, 'Vælg en af de tre svarmuligheder for det viste sted.');
    }
    const config = await getDefinition(pool);
    await transact(async db => {
      const person = await participant(db, req.userId, true);
      requireConsent(person);
      if (!completeQuizzes(config.quizzes, person.quiz_answers)) throw new PilotError(409, 'Gennemfør alle fire quizzer først.');
      const { rows } = await db.query(`SELECT position,response FROM pilot_assignments
        WHERE version=$1 AND user_id=$2 ORDER BY position`, [PILOT, req.userId]);
      const assigned = rows.find(row => row.position === position);
      if (assigned?.response === response) return;
      if (assigned?.response) throw new PilotError(409, 'Svaret er allerede gemt. Kontakt forsøgslederen ved en fejl.');
      if (rows.find(row => row.response === null)?.position !== position) throw new PilotError(409, 'Vurdér det viste sted først.');
      if (response !== 'skip' && !Object.keys(person.preferences).length) {
        throw new PilotError(409, 'Din profil er neutral. Du kan springe steder over eller afslutte sessionen.');
      }
      await db.query(`UPDATE pilot_assignments SET response=$4, responded_at=now(), preference_snapshot=$5
        WHERE version=$1 AND user_id=$2 AND position=$3`,
      [PILOT, req.userId, position, response, response === 'skip' ? null : person.preferences]);
    });
    res.json(await state(pool, config, req.userId));
  });

  router.use((error, _req, res, next) => {
    if (!(error instanceof PilotError)) return next(error);
    res.status(error.status).json({ error: { message: error.message } });
  });
  return router;
}
