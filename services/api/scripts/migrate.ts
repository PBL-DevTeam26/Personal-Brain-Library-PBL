import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../src/db.js';
import { repositoryRoot } from '../src/paths.js';
const actual = resolve(repositoryRoot, 'database/postgres/migrations');
try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  for (const name of (await readdir(actual)).filter(x => x.endsWith('.sql')).sort()) {
    const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [name]);
    if (exists.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(resolve(actual,name),'utf8'));
      await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)',[name]);
      await client.query('COMMIT');
      console.log('applied',name);
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
} finally { await pool.end(); }
