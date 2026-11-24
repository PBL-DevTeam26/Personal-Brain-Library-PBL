import { pool } from '../src/db.js';
import { osmTagFeatures } from '../src/osm-features.js';
// Copenhagen central bounding box. Deliberately limited for polite Overpass use.
const bbox='55.62,12.47,55.75,12.67';
const q=`[out:json][timeout:60];(nwr["amenity"="restaurant"](${bbox});nwr["tourism"="museum"](${bbox}););out center;`;
const endpoint=process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const userAgent='ExploreXP-M1/0.1 (educational Copenhagen restaurant and museum map import; +https://github.com/PBL-DevTeam26/Personal-Brain-Library-PBL)';
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),70000);
const tagFeatures=(kind,tags)=>{
  const f=osmTagFeatures(kind,tags);
  if(kind==='museum'){
    const type=[tags.museum,tags['museum:type']].filter(Boolean).join(' ').toLowerCase();
    if(/modern|contemporary/.test(type))f.art_modern=1;
    // 'art' alone is not evidence that a museum specializes in classical art.
    if(/science|technology|technical/.test(type))f.science=1;
  }
  return f;
};
try{
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':userAgent},body:new URLSearchParams({data:q}),signal:controller.signal});
 if(response.status===406||response.status===429){
  throw new Error(`Overpass returned ${response.status}. Check the provider's usage policy and wait at least 30 seconds before trying again.`);
 }
 if(!response.ok)throw new Error(`Overpass returned ${response.status}`);
 const result=await response.json();const rows=result.elements
  .filter(x=>x.tags?.name && (x.lat??x.center?.lat)!=null && (x.lon??x.center?.lon)!=null)
  .map(x=>({...x,kind:x.tags.amenity==='restaurant'?'restaurant':'museum'}));
 const selected=[...rows.filter(x=>x.kind==='restaurant').slice(0,25),...rows.filter(x=>x.kind==='museum').slice(0,25)];
 const c=await pool.connect();try{
  await c.query('BEGIN');
  for(const p of selected){
   const r=await c.query(`INSERT INTO places(source,source_id,name,kind,latitude,longitude,raw_tags)
       VALUES('osm',$1,$2,$3,$4,$5,$6) ON CONFLICT(source,source_id)
       DO UPDATE SET name=EXCLUDED.name,kind=EXCLUDED.kind,latitude=EXCLUDED.latitude,
       longitude=EXCLUDED.longitude,raw_tags=EXCLUDED.raw_tags,updated_at=now() RETURNING id`,
       [`${p.type}/${p.id}`,p.tags.name,p.kind,p.lat??p.center.lat,p.lon??p.center.lon,p.tags]);
   await c.query("DELETE FROM place_features WHERE place_id=$1 AND origin='osm_tag'",[r.rows[0].id]);
   for(const [code,weight] of Object.entries(tagFeatures(p.kind,p.tags)))
     await c.query(`INSERT INTO place_features(place_id,feature_code,weight,origin)
       VALUES($1,$2,$3,'osm_tag') ON CONFLICT(place_id,feature_code)
       DO UPDATE SET weight=EXCLUDED.weight,origin=EXCLUDED.origin
       WHERE place_features.origin='osm_tag'`,[r.rows[0].id,code,weight]);
  }
  await c.query('COMMIT');console.log(`Imported/upserted ${selected.length} real OSM places. Tags are sparse; enrich later.`);
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}finally{clearTimeout(timer);await pool.end()}
