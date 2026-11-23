import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';
const path = fileURLToPath(new URL('../../../database/migrations/001_init.sql', import.meta.url));
try { await pool.query(await readFile(path, 'utf8')); console.log('Migration 001 applied.'); }
finally { await pool.end(); }
