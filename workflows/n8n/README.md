# Planned n8n role

**Not deployed**. Do not modify existing DealScout, PBL or other n8n workflows for this project.

Once the local M1 pipeline and its Postgres connection are verified, add a separate inactive workflow for ExploreXP:

1. Schedule Trigger (daily/weekly, respect provider quotas).
2. HTTP Request to an Overpass endpoint; scoped geographic query.
3. Code node to normalize OSM node/way/relation IDs and coordinates, reject empty names.
4. Upsert `places` by `(source,source_id)` in the dedicated ExploreXP database.
5. Deterministic taxonomy mapping only for source-supported tags; record provenance.
6. Log imported counts and failures; no silent fabricated tags.

Do not put client-facing requests through n8n. Expo -> Express -> PostgreSQL/Python remains the synchronous path. LLM enrichment and generated quiz review are later optional workflows.
