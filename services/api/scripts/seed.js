import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';
import { DEMO_USER_ID } from '../src/domain.js';
const dataPath = relative => fileURLToPath(new URL('../../../database/seeds/' + relative, import.meta.url));
const features = JSON.parse(await readFile(dataPath('features.json'), 'utf8'));
const quizzes = JSON.parse(await readFile(dataPath('quizzes.json'), 'utf8'));
const c = await pool.connect();
try {
  await c.query('BEGIN');
  await c.query('INSERT INTO users(id, display_name) VALUES($1,$2) ON CONFLICT (id) DO NOTHING', [DEMO_USER_ID,'Demo Explorer']);
  for (const f of features) {
    await c.query(`INSERT INTO features(code,domain,label) VALUES ($1,$2,$3)
      ON CONFLICT(code) DO UPDATE SET domain=EXCLUDED.domain,label=EXCLUDED.label`, [f.code,f.domain,f.label]);
  }
  for (const q of quizzes) {
    await c.query(`INSERT INTO quizzes(id,title,description,domain,xp_reward,is_published) VALUES($1,$2,$3,$4,$5,true)
      ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,domain=EXCLUDED.domain,xp_reward=EXCLUDED.xp_reward,is_published=true`,
      [q.id,q.title,q.description,q.domain,q.xpReward]);
    for (const [i,question] of q.questions.entries()) {
      await c.query(`INSERT INTO questions(id,quiz_id,prompt,position) VALUES($1,$2,$3,$4)
        ON CONFLICT(id) DO UPDATE SET prompt=EXCLUDED.prompt,position=EXCLUDED.position`, [question.id,q.id,question.prompt,i+1]);
      for (const [j,option] of question.options.entries()) {
        await c.query(`INSERT INTO options(id,question_id,label,position) VALUES($1,$2,$3,$4)
          ON CONFLICT(id) DO UPDATE SET label=EXCLUDED.label,position=EXCLUDED.position`, [option.id,question.id,option.label,j+1]);
        await c.query('DELETE FROM option_signals WHERE option_id=$1',[option.id]);
        for (const [code,strength] of Object.entries(option.signals)) {
          await c.query('INSERT INTO option_signals(option_id,feature_code,strength) VALUES($1,$2,$3)',[option.id,code,strength]);
        }
      }
    }
  }
  await c.query('COMMIT');
  console.log(`Seeded ${features.length} features and ${quizzes.length} quiz packs.`);
} catch (err) { await c.query('ROLLBACK'); throw err; }
finally { c.release(); await pool.end(); }
