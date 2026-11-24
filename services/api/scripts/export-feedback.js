import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';
const out=process.argv[2]
 ? resolve(process.argv[2])
 : fileURLToPath(new URL('../../ml/data/feedback.json',import.meta.url));
try{
 const r=await pool.query(`SELECT f.user_id,f.place_id,p.kind,f.interested AS label,f.preference_snapshot AS preferences,
   COALESCE(jsonb_object_agg(pf.feature_code,pf.weight) FILTER(WHERE pf.feature_code IS NOT NULL),'{}'::jsonb) AS place_features
   FROM place_feedback f JOIN places p ON p.id=f.place_id
   LEFT JOIN place_features pf ON pf.place_id=f.place_id
   WHERE f.preference_snapshot <> '{}'::jsonb
   GROUP BY f.user_id,f.place_id,p.kind,f.interested,f.preference_snapshot
   ORDER BY f.user_id,f.place_id`);
 await mkdir(dirname(out),{recursive:true});
 await writeFile(out,JSON.stringify(r.rows,null,2));
 console.log(`Exported ${r.rowCount} human feedback labels to ${out}. Do not commit user feedback.`);
}finally{await pool.end()}
