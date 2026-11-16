# Implementation caveats

- Current API uses a single seeded synthetic dev user. Never run publicly or with real personal data.
- Current quiz POST accepts free text or array, but does not yet validate answer value against question type/options: implement in PBL-007.
- The session currently has no GET/complete endpoints; do not claim complete quiz lifecycle.
- `topic_impressions` created by recommendations, but interactions are not logged yet; model training cannot run on useful observed choices until PBL-008.
- No actual outbox worker or n8n workflow is deployed.
- Auth design: Argon2id password hashing, revocable opaque session tokens, hashed tokens in PostgreSQL, secure HttpOnly cookie on web, secure storage on Android; use CSRF protections for cookie-auth mutation endpoints.
- Enforce per-user scopes by joins/transactions and regression tests before public pilot. Shared taxonomy must never leak private generated user context.
- Before external test deployment: proxy/TLS, no dev header, secrets rotation, service auth, backups, retention/deletion policy, resource caps.
- Docker profile `ai` is local only. n8n initial owner setup required; never expose it publicly before hardening.
- CI currently runs `npm install` because there is no lockfile. Generate and commit `package-lock.json`, then switch to `npm ci` before accepting the first PR.
- A production-ready API needs stronger error handling, rate limiting, structured logs, readiness probes, auth and migration rollback strategy.
