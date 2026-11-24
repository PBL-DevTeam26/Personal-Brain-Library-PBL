import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { pool } from '../src/db.js';
import { exportFeedback } from '../src/pilot-data.js';
const { values, positionals } = parseArgs({ options: { pilot2: { type: 'boolean' } }, allowPositionals: true });
if (positionals.length > 1) throw new Error('Provide at most one output path.');
const filename = values.pilot2 ? 'feedback-pilot-2.json' : 'feedback.json';
const out=positionals[0] ? resolve(positionals[0]) : fileURLToPath(new URL('../../ml/data/' + filename,import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const exportPath = relative(root, out).split(sep).join('/');
if (!isAbsolute(relative(root, out)) && !exportPath.startsWith('../') &&
    !['services/ml/data/', 'services/ml/artifacts/'].some(dir => exportPath.startsWith(dir))) {
  throw new Error('Use a Git-ignored ML directory or a private directory outside this checkout.');
}
try{
 const rows = await exportFeedback(pool, values.pilot2);
 await mkdir(dirname(out),{recursive:true});
 await writeFile(out,JSON.stringify(rows,null,2), { mode: 0o600 });
 console.log(`Exported ${rows.length} human feedback labels to ${out}. Do not commit user feedback.`);
}finally{await pool.end()}
