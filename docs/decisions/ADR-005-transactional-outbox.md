# ADR-005: Transactional Outbox

**Status:** Accepted in M1.6 (implementation may be pending)

## Context
PBL MVP must support two developers, cross-platform UI, privacy, ML and automation on a low budget.

## Decision
Quiz answer and outbox event committed atomically; worker retry later.

## Consequences
Implementation must enforce the decision; update the ADR when its constraints or tradeoffs change.
