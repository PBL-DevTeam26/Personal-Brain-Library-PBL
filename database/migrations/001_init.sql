BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 display_name text NOT NULL DEFAULT 'Explorer',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS features (
 code text PRIMARY KEY,
 domain text NOT NULL CHECK (domain IN ('shared','food','culture')),
 label text NOT NULL
);
CREATE TABLE IF NOT EXISTS places (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source text NOT NULL,
 source_id text NOT NULL,
 name text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('restaurant','museum')),
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
 raw_tags jsonb NOT NULL DEFAULT '{}'::jsonb,
 description text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source,source_id)
);
CREATE INDEX IF NOT EXISTS places_kind_idx ON places(kind);
CREATE TABLE IF NOT EXISTS place_features (
 place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
 feature_code text NOT NULL REFERENCES features(code),
 weight real NOT NULL CHECK (weight BETWEEN 0 AND 1),
 origin text NOT NULL CHECK (origin IN ('osm_tag','curated','llm')),
 PRIMARY KEY(place_id,feature_code)
);
CREATE TABLE IF NOT EXISTS place_embeddings (
 place_id uuid PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
 model text NOT NULL,
 embedding vector(384) NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS quizzes (
 id text PRIMARY KEY,
 title text NOT NULL,
 description text NOT NULL,
 domain text NOT NULL CHECK (domain IN ('food','culture')),
 xp_reward integer NOT NULL DEFAULT 100 CHECK (xp_reward BETWEEN 0 AND 1000),
 is_published boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS questions (
 id text PRIMARY KEY,
 quiz_id text NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
 prompt text NOT NULL,
 position integer NOT NULL,
 UNIQUE(quiz_id,position)
);
CREATE TABLE IF NOT EXISTS options (
 id text PRIMARY KEY,
 question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
 label text NOT NULL,
 position integer NOT NULL,
 UNIQUE(question_id,position),
 UNIQUE(id,question_id)
);
CREATE TABLE IF NOT EXISTS option_signals (
 option_id text NOT NULL REFERENCES options(id) ON DELETE CASCADE,
 feature_code text NOT NULL REFERENCES features(code),
 strength real NOT NULL CHECK (strength BETWEEN -1 AND 1),
 PRIMARY KEY(option_id,feature_code)
);
CREATE TABLE IF NOT EXISTS quiz_submissions (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 quiz_id text NOT NULL REFERENCES quizzes(id),
 completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,quiz_id)
);
CREATE TABLE IF NOT EXISTS user_answers (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 question_id text NOT NULL REFERENCES questions(id),
 option_id text NOT NULL,
 answered_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,question_id),
 FOREIGN KEY(option_id,question_id) REFERENCES options(id,question_id)
);
CREATE TABLE IF NOT EXISTS user_preferences (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 feature_code text NOT NULL REFERENCES features(code),
 score real NOT NULL CHECK (score BETWEEN -1 AND 1),
 observations integer NOT NULL CHECK (observations > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,feature_code)
);
CREATE TABLE IF NOT EXISTS xp_events (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_key text NOT NULL,
 amount integer NOT NULL CHECK (amount >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,event_key)
);
CREATE TABLE IF NOT EXISTS place_feedback (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
 interested boolean NOT NULL,
 preference_snapshot jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,place_id)
);
CREATE INDEX IF NOT EXISTS feedback_place_idx ON place_feedback(place_id);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON place_feedback(user_id);
COMMIT;
