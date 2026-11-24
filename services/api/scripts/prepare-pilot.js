import { pool } from '../src/db.js';
import { preparePilot } from '../src/pilot-data.js';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const count = await preparePilot(client);
  await client.query('COMMIT');
  console.log(`${count} dokumenterede steder klar til pilot-audit.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
