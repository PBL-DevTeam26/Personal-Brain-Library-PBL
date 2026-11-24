import { pool } from '../src/db.js';
import { osmTagFeatures } from '../src/osm-features.js';

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: places } = await client.query(`
      SELECT id, kind, raw_tags FROM places WHERE source = 'osm' ORDER BY id FOR SHARE
    `);
    const features = places.flatMap(place =>
      Object.entries(osmTagFeatures(place.kind, place.raw_tags)).map(([code, weight]) => ({
        place_id: place.id,
        feature_code: code,
        weight,
      })),
    );
    const { rowCount } = await client.query(`
      INSERT INTO place_features (place_id, feature_code, weight, origin)
      SELECT place_id, feature_code, weight, 'osm_tag'
      FROM jsonb_to_recordset($1::jsonb) AS feature(place_id uuid, feature_code text, weight real)
      ON CONFLICT (place_id, feature_code) DO NOTHING
    `, [JSON.stringify(features)]);
    await client.query('COMMIT');
    console.log(`Added ${rowCount} OSM features across ${places.length} OSM places checked.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
