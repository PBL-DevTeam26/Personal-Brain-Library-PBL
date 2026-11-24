import { isDeepStrictEqual } from 'node:util';
import { PILOT, catalogProblems, definition, manifest } from './pilot-domain.js';
import { osmTagFeatures } from './osm-features.js';

export async function pilotCatalog(db) {
  const { rows } = await db.query('SELECT * FROM pilot_places WHERE version=$1 ORDER BY place_id', [PILOT]);
  return rows;
}

export async function preparePilot(db) {
  const { rows } = await db.query(`SELECT id,source_id,kind,raw_tags FROM places WHERE source='osm'
    AND source_id=ANY($1::text[])`, [manifest.map(place => place.source_id)]);
  const base = new Map(rows.map(row => [row.source_id, row]));
  const expected = manifest.map(({ source_id, ...place }) => {
    const match = base.get(source_id);
    if (!match || match.kind !== place.kind) throw new Error('Sted mangler eller har forkert kategori: ' + source_id);
    const derived = osmTagFeatures(match.kind, match.raw_tags);
    for (const [code, evidence] of Object.entries(place.evidence)) {
      if (evidence.url.startsWith('https://www.openstreetmap.org/') && derived[code] !== 1) {
        throw new Error('Gemt OSM-tag støtter ikke ' + code + ' for ' + source_id);
      }
    }
    return { version: PILOT, place_id: match.id, source_id, ...place,
      features: Object.fromEntries(Object.keys(place.evidence).map(code => [code, 1])) };
  }).sort((left, right) => left.place_id.localeCompare(right.place_id));
  const errors = catalogProblems(expected);
  if (errors.length) throw new Error(errors.join('\n'));

  const version = await db.query('INSERT INTO pilot_versions(id,definition) VALUES($1,$2) ON CONFLICT DO NOTHING', [PILOT, definition]);
  if (version.rowCount) {
    await db.query(`INSERT INTO pilot_places SELECT * FROM jsonb_populate_recordset(NULL::pilot_places,$1::jsonb)`, [JSON.stringify(expected)]);
  }
  const { rows: [stored] } = await db.query('SELECT definition FROM pilot_versions WHERE id=$1', [PILOT]);
  if (!isDeepStrictEqual(definition, stored.definition) || !isDeepStrictEqual(expected, await pilotCatalog(db))) {
    throw new Error('Pilotversionen er allerede låst. Brug en ny pilotversion ved ændringer.');
  }
  return expected.length;
}

export async function exportFeedback(db, pilot2 = false) {
  const { rows } = pilot2 ? await db.query(`SELECT a.user_id,a.place_id,p.kind,a.response='yes' AS label,
    a.preference_snapshot AS preferences,p.features AS place_features,a.version AS pilot_version
    FROM pilot_assignments a JOIN pilot_places p USING(version,place_id)
    WHERE a.version=$1 AND a.response IN ('yes','no') ORDER BY a.user_id,a.place_id`, [PILOT]) :
    await db.query(`SELECT user_id,place_id,kind,label,preferences,place_features FROM pilot1_feedback_archive
      WHERE preferences <> '{}'::jsonb ORDER BY user_id,place_id`);
  return rows;
}
