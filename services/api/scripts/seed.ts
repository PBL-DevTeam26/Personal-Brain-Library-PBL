import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../src/db.js';
import { repositoryRoot } from '../src/paths.js';
const path = resolve(repositoryRoot, 'database/postgres/seeds/001_dev.sql');
try { await pool.query(await readFile(path,'utf8')); console.log('synthetic seed applied'); } finally { await pool.end(); }
