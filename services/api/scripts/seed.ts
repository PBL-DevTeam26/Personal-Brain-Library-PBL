import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../src/db.js';
const path = process.cwd().endsWith('services/api') ? resolve(process.cwd(),'../../database/postgres/seeds/001_dev.sql') : resolve(process.cwd(),'database/postgres/seeds/001_dev.sql');
try { await pool.query(await readFile(path,'utf8')); console.log('synthetic seed applied'); } finally { await pool.end(); }
