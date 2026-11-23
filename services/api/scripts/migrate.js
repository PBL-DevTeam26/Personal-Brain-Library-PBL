import { readFile, readdir } from 'node:fs/promises';
import { pool } from '../src/db.js';
const directory = new URL('../../../database/migrations/', import.meta.url);
try {
 for (const name of (await readdir(directory)).filter(name=>/^\d+.*\.sql$/.test(name)).sort()) {
  await pool.query(await readFile(new URL(name, directory), 'utf8'));
  console.log(`Migration ${name} applied.`);
 }
}
finally { await pool.end(); }
