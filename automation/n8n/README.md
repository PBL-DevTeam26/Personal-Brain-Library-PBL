# Workflow specifications (NOT deployed)

1. `answer-processor`: consume `answer.created` through authenticated internal worker, extract validated fact proposals, persist in PostgreSQL, then project to Neo4j.
2. `question-generator`: inspect knowledge gaps, emit taxonomy/question proposals, validate and deduplicate before activation.
3. `profile-reconciliation`: rebuild/reconcile Neo4j from PostgreSQL, handle deletions and revisions.
4. `ml-training-trigger`: schedule candidate training, store evaluations, require explicit activation policy.

No operational n8n workflow export is included yet. Do not connect n8n directly to a public mobile client.
