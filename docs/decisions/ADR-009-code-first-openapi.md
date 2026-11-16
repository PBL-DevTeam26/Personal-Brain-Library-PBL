# ADR-009: Code First Openapi

**Status:** Accepted in M1.6 (implementation may be pending)

## Context
PBL MVP must support two developers, cross-platform UI, privacy, ML and automation on a low budget.

## Decision
Express routes with JSDoc generate OpenAPI; Zod validates runtime; CI checks API spec changes.

## Consequences
Implementation must enforce the decision; update the ADR when its constraints or tradeoffs change.
