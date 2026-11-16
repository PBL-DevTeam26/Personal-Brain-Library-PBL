CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id),
  canonical_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('candidate','active','merged','rejected')),
  origin TEXT NOT NULL DEFAULT 'seed' CHECK(origin IN ('seed','ai','admin'))
);
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  canonical_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('candidate','active','merged','rejected')),
  origin TEXT NOT NULL DEFAULT 'seed' CHECK(origin IN ('seed','ai','admin'))
);
CREATE TABLE knowledge_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id),
  canonical_key TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(topic_id, canonical_key)
);
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id),
  dimension_id UUID REFERENCES knowledge_dimensions(id),
  canonical_intent TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK(question_type IN ('text','single_choice','multi_choice')),
  prompt TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'da',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('candidate','active','rejected')),
  origin TEXT NOT NULL DEFAULT 'seed' CHECK(origin IN ('seed','ai','admin')),
  UNIQUE(topic_id, canonical_intent, language_code)
);
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id),
  option_value TEXT NOT NULL,
  option_label TEXT NOT NULL,
  display_order INT NOT NULL,
  UNIQUE(question_id, option_value)
);
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  status TEXT NOT NULL CHECK(status IN ('in_progress','completed','abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE TABLE session_questions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES quiz_sessions(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  position INT NOT NULL,
  UNIQUE(session_id, question_id),
  UNIQUE(session_id, position)
);
CREATE TABLE answers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  answer_json JSONB NOT NULL,
  idempotency_key UUID NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key),
  UNIQUE(session_id, question_id)
);
CREATE TABLE topic_impressions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  batch_id UUID NOT NULL,
  display_position INT NOT NULL CHECK(display_position BETWEEN 1 AND 3),
  strategy TEXT NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, display_position)
);
CREATE TABLE topic_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impression_id UUID NOT NULL REFERENCES topic_impressions(id),
  action TEXT NOT NULL CHECK(action IN ('selected','skipped','completed','abandoned')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE knowledge_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  dimension_id UUID REFERENCES knowledge_dimensions(id),
  subject_key TEXT NOT NULL,
  predicate_key TEXT NOT NULL,
  object_value JSONB NOT NULL,
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('explicit','inferred')),
  status TEXT NOT NULL DEFAULT 'current' CHECK(status IN ('current','superseded','disputed','rejected')),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ
);
CREATE TABLE fact_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id UUID NOT NULL REFERENCES knowledge_facts(id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES answers(id),
  evidence_text TEXT,
  UNIQUE(fact_id,answer_id)
);
CREATE TABLE taxonomy_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_type TEXT NOT NULL CHECK(proposal_type IN ('category','topic','question')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK(status IN ('candidate','active','rejected','merged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','failed')),
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_outbox_pending ON outbox_events(status,created_at);
CREATE INDEX idx_answers_user ON answers(user_id,answered_at DESC);
CREATE INDEX idx_impressions_user ON topic_impressions(user_id,shown_at DESC);
CREATE INDEX idx_facts_user ON knowledge_facts(user_id,status);
