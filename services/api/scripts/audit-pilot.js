import { isDeepStrictEqual } from 'node:util';
import { pool } from '../src/db.js';
import { DOMAINS, PILOT, QUOTAS, TOTAL, catalogProblems, definition, manifest, preferenceProfile, quizAnswers, selectPilotPlaces } from '../src/pilot-domain.js';
import { exportFeedback, pilotCatalog } from '../src/pilot-data.js';

const db = await pool.connect();
try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const catalog = await pilotCatalog(db);
  const errors = catalogProblems(catalog);
  const recorded = catalog.map(({ source_id, kind, name, description, anchor, evidence }) =>
    ({ source_id, kind, name, description, anchor, evidence })).sort((a, b) => a.source_id.localeCompare(b.source_id));
  if (!isDeepStrictEqual(recorded, [...manifest].sort((a, b) => a.source_id.localeCompare(b.source_id)))) {
    errors.push('Pilotkataloget afviger fra det versionsstyrede manifest.');
  }
  const { rows: [version] } = await db.query('SELECT definition FROM pilot_versions WHERE id=$1', [PILOT]);
  if (!isDeepStrictEqual(version?.definition, definition)) errors.push('Quiz- eller samtykkeversionen mangler eller er ændret.');
  const { rows: [{ enforced }] } = await db.query(`SELECT EXISTS(SELECT FROM pg_trigger
    WHERE tgrelid='pilot_assignments'::regclass AND tgname='pilot_response_gate' AND tgenabled IN ('O','A')) AS enforced`);
  if (!enforced) errors.push('Databasens kontrol af gennemførte quizzer og snapshot er ikke aktiv.');

  const { rows: people } = await db.query('SELECT * FROM pilot_participants WHERE version=$1 ORDER BY user_id', [PILOT]);
  const { rows: assignments } = await db.query(`SELECT a.*,p.kind,p.features FROM pilot_assignments a
    JOIN pilot_places p USING(version,place_id) WHERE a.version=$1 ORDER BY a.user_id,a.position`, [PILOT]);
  let duplicates = 0;
  let missingSnapshots = 0;
  let labelsWithoutProfile = 0;
  const countResponses = rows => Object.fromEntries(Object.entries({ yes: 'positive', no: 'negative', skip: 'skipped' })
    .map(([response, label]) => [label, rows.filter(row => row.response === response).length]));
  const participants = people.map((person, index) => {
    const tag = 'P' + (index + 1);
    const saved = person.quiz_answers;
    const completed = definition.quizzes.filter(quiz => {
      if (!Object.hasOwn(saved, quiz.id)) return false;
      return quizAnswers(quiz, Object.entries(saved[quiz.id]).map(([questionId, optionId]) => ({ questionId, optionId }))) !== null;
    }).length;
    const profile = preferenceProfile(definition.quizzes, saved);
    if (!isDeepStrictEqual(profile, person.preferences) || Object.keys(saved).length !== completed) errors.push(tag + ' har ugyldige quizdata.');
    const rows = assignments.filter(row => row.user_id === person.user_id);
    duplicates += rows.length - new Set(rows.map(row => row.place_id)).size;
    if (rows.length !== TOTAL || !isDeepStrictEqual(rows.map(row => row.place_id),
      selectPilotPlaces(catalog, person.user_id).map(place => place.place_id))) errors.push(tag + ' har et ugyldigt stedudvalg.');
    rows.filter(row => row.response === 'yes' || row.response === 'no').forEach(row => {
      if (completed !== definition.quizzes.length || !Object.keys(profile).length) labelsWithoutProfile++;
      if (!row.preference_snapshot || !Object.keys(row.features).length || !isDeepStrictEqual(row.preference_snapshot, profile)) missingSnapshots++;
    });
    return { participant: tag, quizzes: completed, usableSignals: Object.keys(profile).length,
      complete: rows.length === TOTAL && rows.every(row => row.response !== null),
      byKind: Object.fromEntries(Object.keys(QUOTAS).map(kind => [kind, countResponses(rows.filter(row => row.kind === kind))])) };
  });
  if (duplicates || missingSnapshots || labelsWithoutProfile) errors.push('Pilotdata har dubletter, labels uden quizprofil eller manglende snapshots.');

  const labels = await exportFeedback(db, true);
  const responses = countResponses(assignments);
  if (labels.length !== responses.positive + responses.negative ||
      !isDeepStrictEqual(labels, await exportFeedback(db, true))) errors.push('Eksporten er ufuldstændig eller ustabil.');
  const { rows: [history] } = await db.query(`SELECT count(*)::int AS archived,
    count(f.user_id)::int AS preserved FROM pilot1_feedback_archive a
    LEFT JOIN place_feedback f ON (f.user_id,f.place_id)=(a.user_id,a.place_id)
      AND f.interested=a.label AND f.preference_snapshot=a.preferences`);
  if (history.archived !== history.preserved) errors.push('Historiske vurderinger afviger fra arkivet.');
  await db.query('COMMIT');

  const byKind = Object.fromEntries(Object.entries(DOMAINS).map(([kind, codes]) => {
    const group = catalog.filter(row => row.kind === kind);
    return [kind, { places: group.length, featureCoverage: Object.fromEntries(codes.map(code =>
      [code, group.filter(row => row.features[code] === 1).length])),
    ...countResponses(assignments.filter(row => row.kind === kind)) }];
  }));
  const verified = catalog.filter(place => Object.keys(place.features).length > 0 && Object.keys(place.features).every(code =>
    typeof place.evidence?.[code]?.detail === 'string' && /^https:\/\//.test(place.evidence[code].url))).length;
  console.log(JSON.stringify({ status: errors.length ? 'BLOCKED' : 'READY', pilot: PILOT,
    recruitmentOpen: process.env.PILOT2_OPEN === '1', byKind, verified, catalogSize: catalog.length,
    verifiedShare: catalog.length ? verified / catalog.length : 0, responses,
    positiveShare: labels.length ? responses.positive / labels.length : null,
    targetNewParticipants: 10, enrolled: participants.length,
    completedParticipants: participants.filter(person => person.complete).length,
    participants, emptyProfiles: participants.filter(person => person.quizzes === definition.quizzes.length && !person.usableSignals).length,
    duplicates, missingSnapshots, labelsWithoutProfile, historicalRatings: history, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await db.query('ROLLBACK');
  console.error(JSON.stringify({ status: 'BLOCKED', errors: [error.message] }));
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
