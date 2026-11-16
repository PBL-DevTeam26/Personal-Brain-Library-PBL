# PBL prioritized GitHub issue backlog

All issues are proposals, not created in the connected repository.

| ID | P | Issue | Depends on | Acceptance |
|---|---|---|---|---|
| PBL-001 | P0 | Bootstrap monorepo and branch protection | - | PR workflow documented; CI runs |
| PBL-002 | P0 | PostgreSQL migrations + seed | 001 | Fresh DB migrates and seeds |
| PBL-003 | P0 | Topics GET + code-first OpenAPI | 002 | Lists seeded topics; valid spec |
| PBL-004 | P0 | Quiz session POST | 003 | Creates owned session with questions |
| PBL-005 | P0 | Answers POST and transactional outbox | 004 | Idempotent writes; event persisted |
| PBL-006 | P0 | Real user auth & authorization | 002 | Multi-user isolation; replace dev header |
| PBL-007 | P0 | Full quiz session lifecycle | 005 | GET/complete/skip; state validated |
| PBL-008 | P0 | Topic interaction logging | 003 | Display/choice/skip record accurate |
| PBL-009 | P0 | Outbox worker + retries | 005 | Delivery, locks, dead letter tested |
| PBL-010 | P0 | n8n answer extraction | 009 | Schema validated, provenance persisted |
| PBL-011 | P0 | Neo4j projection and reconciliation | 010 | User scoping, rebuild, deletion |
| PBL-012 | P0 | ML baseline, synthetic data | 008 | Feature schema; leakage checks |
| PBL-013 | P0 | ML logreg vs random forest | 012 | Split, metrics, recorded limitations |
| PBL-014 | P0 | Ranking engine + ML fallback | 013 | Three diverse candidates |
| PBL-015 | P0 | Expo app for Android and web | 003,004,005 | Quiz works on both platforms |
| PBL-016 | P0 | Personal RAG retrieval and chat | 011,006 | Grounded, user scoped responses |
| PBL-017 | P0 | KDE + controlled AI topic generation | 010,011 | Dedupe, proposal lifecycle, fallback |
| PBL-018 | P0 | Privacy deletion flow and policy | 006,011 | No resurrection of deleted facts |
| PBL-019 | P0 | Integration tests and pilot | 014,015,016 | Test plan and reported results |
| PBL-020 | P0 | Exam report and individual contributions | all | Evidence from both students |
| PBL-021 | P1 | Progression and profile UI | 015 | Completed topics visible |
| PBL-022 | P1 | Observability and performance budget | 009 | Metrics and failed job inspection |

**Initial PR objective:** PBL-001 to PBL-005. The archive includes scaffolds for these, but full E2E verification requires a running PostgreSQL instance.
