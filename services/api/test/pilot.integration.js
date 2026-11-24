import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import 'dotenv/config';
import pg from 'pg';
import { manifest } from '../src/pilot-domain.js';

const url = new URL(process.env.DATABASE_URL);
const admin = new pg.Client({ connectionString: url.href });
// Only this newly created database receives test profiles, ratings and mutations.
const name = 'explorexp_pilot2_test_' + randomBytes(6).toString('hex');
let created = false;
let pool;
let server;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  created = true;
  url.pathname = '/' + name;
  process.env.DATABASE_URL = url.href;
  ({ pool } = await import('../src/db.js'));
  const { preparePilot, exportFeedback } = await import('../src/pilot-data.js');
  const { createApp } = await import('../src/app.js');
  const migrate = async file => pool.query(await readFile(new URL('../../../database/migrations/' + file, import.meta.url), 'utf8'));
  await migrate('001_init.sql');
  await migrate('002_instance.sql');
  await pool.query("INSERT INTO features VALUES ('history','culture','Historie')");
  for (const place of manifest) {
    const codes = Object.keys(place.evidence);
    const raw = {};
    if (codes.includes('cuisine_asian')) raw.cuisine = 'asian';
    if (codes.includes('cuisine_italian')) raw.cuisine = 'italian';
    if (codes.includes('plant_based')) raw['diet:vegetarian'] = 'yes';
    await pool.query(`INSERT INTO places(source,source_id,name,kind,latitude,longitude,raw_tags)
      VALUES('osm',$1,$2,$3,55,12,$4)`, [place.source_id, place.name, place.kind, raw]);
  }
  await pool.query(`INSERT INTO users(id) VALUES('00000000-0000-4000-8000-000000000001');
    INSERT INTO place_feedback(user_id,place_id,interested,preference_snapshot)
    SELECT '00000000-0000-4000-8000-000000000001',id,true,'{"history":1}' FROM places WHERE kind='museum' LIMIT 1;
    INSERT INTO place_features(place_id,feature_code,weight,origin)
    SELECT place_id,'history',1,'osm_tag' FROM place_feedback;`);
  await migrate('003_pilot2.sql');
  const prep = await pool.connect();
  try {
    await prep.query('BEGIN');
    assert.equal(await preparePilot(prep), 24);
    assert.equal(await preparePilot(prep), 24);
    await prep.query('COMMIT');
  } finally { prep.release(); }
  const runAudit = status => {
    const audit = spawnSync(process.execPath, ['scripts/audit-pilot.js'], { encoding: 'utf8' });
    assert.equal(audit.status, status, audit.stderr || audit.stdout);
    return JSON.parse(audit.stdout);
  };
  assert.equal(runAudit(0).verifiedShare, 1);
  const legacy = await exportFeedback(pool);
  assert.equal(legacy.length, 1);

  if (process.argv.includes('--preview')) {
    process.env.PILOT2_OPEN = '1';
    const host = process.env.PILOT_PREVIEW_HOST || '127.0.0.1';
    server = createApp().listen(3312, host);
    await once(server, 'listening');
    console.log('Isoleret Pilot 2-test-API på port 3312. Tryk Enter eller Ctrl+C for at rydde op.');
    await new Promise(resolve => {
      process.once('SIGINT', resolve);
      process.stdin.once('data', resolve);
      process.stdin.resume();
    });
    process.stdin.pause();
    const audit = runAudit(0);
    console.log(JSON.stringify({ participants: audit.completedParticipants, responses: audit.responses }));
  } else {
    server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const call = async (path, { status = 200, user, method = 'GET', body } = {}) => {
      const response = await fetch(base + path, { method, headers: {
        'Content-Type': 'application/json', ...(user && { 'X-Explore-User': user }),
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await response.json();
      assert.equal(response.status, status, JSON.stringify(json));
      return json;
    };
    const create = async () => (await call('/demo-users', { method: 'POST', status: 201 })).userId;
    const user = await create();
    const root = '/pilot-2';
    const state = user => call(root, { user });
    const consent = (user, status = 200, accepted = true) => call(root + '/consent', {
      status, user, method: 'POST', body: { accepted, version: 'pilot-2-v1' },
    });
    const put = (user, route, body, status = 200) => call(root + route, { user, method: 'PUT', body, status });
    const rate = (user, position, response, status) => put(user, '/ratings/' + position, { response }, status);
    const complete = async (user, neutral = false) => {
      const { quizzes } = await state(user);
      for (const [index, quiz] of quizzes.entries()) {
        const answers = quiz.questions.map(question => ({ questionId: question.id, optionId: !neutral && !index ? 'avoid' : 'neutral' }));
        await put(user, '/quizzes/' + quiz.id, { answers: [] }, 400);
        await put(user, '/quizzes/' + quiz.id, { answers });
        await put(user, '/quizzes/' + quiz.id, { answers: [...answers].reverse() });
        if (index < 3) await rate(user, 1, 'yes', 409);
      }
      return state(user);
    };

    delete process.env.PILOT2_OPEN;
    await call(root, { user, status: 503 });
    process.env.PILOT2_OPEN = '1';
    await rate(user, 1, 'yes', 409);
    await consent(user, 400, false);
    await consent(legacy[0].user_id, 409);
    await Promise.all([consent(user), consent(user)]);
    await rate(user, 1, 'yes', 409);
    await assert.rejects(pool.query(`UPDATE pilot_assignments SET response='yes',responded_at=now(),preference_snapshot='{"history":1}'
      WHERE user_id=$1 AND position=1`, [user]), /Complete all pilot quizzes/);

    const profile = await complete(user);
    assert.deepEqual(profile.preferences, { cuisine_asian: -1, cuisine_italian: -1 });
    assert.deepEqual(Object.keys(profile.nextPlace).sort(), ['description', 'kind', 'name', 'position']);
    await rate(user, 2, 'no', 409);
    await Promise.all([rate(user, 1, 'skip'), rate(user, 1, 'skip')]);
    await rate(user, 1, 'no', 409);
    assert.deepEqual(await exportFeedback(pool, true), []);
    const next = (await state(user)).nextPlace;
    assert.equal(next.position, 2);
    assert.deepEqual((await consent(user)).nextPlace, next);
    await Promise.all([rate(user, 2, 'no'), rate(user, 2, 'no')]);
    await rate(user, 2, 'yes', 409);
    for (let position = 3; position <= 15; position++) await rate(user, position, 'yes');
    const finished = await state(user);
    assert.equal(finished.answered, 15);
    assert.equal(finished.nextPlace, null);

    const neutral = await create();
    await consent(neutral);
    assert.deepEqual((await complete(neutral, true)).preferences, {});
    await rate(neutral, 1, 'yes', 409);
    await rate(neutral, 1, 'skip');
    const labels = await exportFeedback(pool, true);
    assert.equal(labels.length, 14);
    assert.equal(labels.filter(row => !row.label).length, 1);
    assert(labels.every(row => row.pilot_version === 'pilot-2-v1' && Object.keys(row.place_features).length > 0));
    await pool.query("UPDATE place_features SET weight=0.5; UPDATE places SET description='Different live data'");
    await migrate('003_pilot2.sql');
    assert.deepEqual(await exportFeedback(pool), legacy);
    assert.deepEqual(await exportFeedback(pool, true), labels);
    const audit = runAudit(0);
    assert.deepEqual(audit.responses, { positive: 13, negative: 1, skipped: 2 });
    assert.equal(audit.emptyProfiles, 1);
    assert.deepEqual(audit.historicalRatings, { archived: 1, preserved: 1 });
    await pool.query('ALTER TABLE pilot_assignments DISABLE TRIGGER pilot_response_gate');
    assert.equal(runAudit(1).status, 'BLOCKED');
    console.log('Pilot 2 E2E passed with two isolated test profiles.');
  }
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end();
  if (created) await admin.query(`DROP DATABASE ${name}`);
  await admin.end();
}
