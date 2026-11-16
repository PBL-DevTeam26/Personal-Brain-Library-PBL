# Personal Brain Library (PBL)

Bootstrap for the existing **PBL-DevTeam26/Personal-Brain-Library-PBL-** repository. This is a **local starter**, not a deployed system. No files have been pushed to GitHub.

## Scope delivered

- TypeScript / Express API with Zod runtime request validation.
- PostgreSQL 17 schema, repeatable migrations, seed data, and parameterized SQL.
- Topics, recommendations (deterministic fallback), quiz sessions and answers.
- Transactional outbox when an answer is saved.
- OpenAPI generated **code-first from route JSDoc** via swagger-jsdoc.
- Starter Python FastAPI ML service (heuristic fallback only; **not a trained model**).
- Docker Compose for PostgreSQL with optional Neo4j/n8n/Ollama profiles.
- GitHub Actions, Vitest unit tests, decisions, backlog and M1.6 requirements.

**Not included as implemented:** real authentication, user account management, live n8n ingestion, graph sync, embedding/RAG, trained ML, Android/web UI. They are documented integration targets. The API *refuses startup* outside `development` until production auth is implemented.

## Quick start (local)

Prerequisites: Docker Desktop, Node.js 22+, npm.

```bash
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
docker compose up -d postgres
npm --prefix services/api install
npm --prefix services/api run db:migrate
npm --prefix services/api run db:seed
npm --prefix services/api run dev
```

In a second terminal:

```bash
curl http://localhost:3001/health
curl -H 'x-dev-user-id: 00000000-0000-4000-8000-000000000001' http://localhost:3001/api/v1/topics
curl -H 'x-dev-user-id: 00000000-0000-4000-8000-000000000001' http://localhost:3001/api/v1/topics/recommendations
```

For POST calls, see `docs/api-requests.http` (VS Code REST Client format).

Swagger UI: http://localhost:3001/docs ; generated OpenAPI at `/openapi.json`. Run `npm --prefix services/api run openapi:export` to write `docs/openapi.generated.json`.

## Dev identity warning

`x-dev-user-id` is ONLY enabled with `NODE_ENV=development` and `DEV_AUTH_ENABLED=true`, bound to the synthetic seeded user. **Never expose the API on the public internet in this mode.** Production authentication is a blocking milestone, not an option.

## Testing

```bash
npm --prefix services/api test
npm --prefix services/api run typecheck
npm --prefix services/api run openapi:export
```

## Structure

- `apps/mobile`: Expo app placeholder, planned next.
- `services/api`: running API starter.
- `services/ml`: FastAPI interface starter, no trained model.
- `automation/n8n`: workflow contracts and planned workflows.
- `database/postgres`: forward-only SQL migrations and seed.
- `database/neo4j`: constraints and planned projection schema.
- `infrastructure`: config and future deployment notes.
- `docs`: M1.6 specification, ADRs, API examples, backlog.

## Branch workflow for existing repository

```bash
git clone https://github.com/PBL-DevTeam26/Personal-Brain-Library-PBL-.git
cd Personal-Brain-Library-PBL-
git checkout -b feat/m1-bootstrap
# Copy contents of ZIP into repository; inspect git diff first
git add .
git commit -m "chore: bootstrap PBL API, DB, contracts and documentation"
git push -u origin feat/m1-bootstrap
# Open PR; merge after review
```

Never commit `.env`, database dumps, personal responses, ML training datasets with personal data, or secrets.
