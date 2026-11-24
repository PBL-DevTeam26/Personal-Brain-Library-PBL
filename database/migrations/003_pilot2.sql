BEGIN;

CREATE TABLE IF NOT EXISTS pilot1_feedback_archive AS
SELECT f.user_id, f.place_id, p.kind, f.interested AS label,
       f.preference_snapshot AS preferences,
       COALESCE((
         SELECT jsonb_object_agg(pf.feature_code, pf.weight)
         FROM place_features pf WHERE pf.place_id = f.place_id
       ), '{}'::jsonb) AS place_features
FROM place_feedback f JOIN places p ON p.id = f.place_id;
CREATE UNIQUE INDEX IF NOT EXISTS pilot1_feedback_archive_pair
 ON pilot1_feedback_archive(user_id, place_id);

CREATE TABLE IF NOT EXISTS pilot_versions (
 id text PRIMARY KEY,
 definition jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS pilot_places (
 version text NOT NULL REFERENCES pilot_versions(id),
 place_id uuid NOT NULL REFERENCES places(id),
 source_id text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('restaurant', 'museum')),
 name text NOT NULL CHECK (length(trim(name)) > 0),
 description text NOT NULL CHECK (length(trim(description)) > 0),
 anchor boolean NOT NULL DEFAULT false,
 features jsonb NOT NULL CHECK (jsonb_typeof(features) = 'object' AND features <> '{}'::jsonb),
 evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'object' AND evidence <> '{}'::jsonb),
 PRIMARY KEY(version, place_id)
);

CREATE TABLE IF NOT EXISTS pilot_participants (
 version text NOT NULL REFERENCES pilot_versions(id),
 user_id uuid NOT NULL REFERENCES users(id),
 consented_at timestamptz NOT NULL DEFAULT now(),
 quiz_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
 preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
 PRIMARY KEY(version, user_id)
);

CREATE TABLE IF NOT EXISTS pilot_assignments (
 version text NOT NULL,
 user_id uuid NOT NULL,
 position integer NOT NULL CHECK (position BETWEEN 1 AND 15),
 place_id uuid NOT NULL,
 response text CHECK (response IN ('yes', 'no', 'skip')),
 responded_at timestamptz,
 preference_snapshot jsonb,
 PRIMARY KEY(version, user_id, position),
 UNIQUE(version, user_id, place_id),
 FOREIGN KEY(version, user_id) REFERENCES pilot_participants(version, user_id),
 FOREIGN KEY(version, place_id) REFERENCES pilot_places(version, place_id),
 CHECK ((response IS NULL) = (responded_at IS NULL)),
 CHECK (
   (COALESCE(response IN ('yes', 'no'), false) AND jsonb_typeof(preference_snapshot) = 'object'
     AND preference_snapshot IS NOT NULL AND preference_snapshot <> '{}'::jsonb)
   OR ((response IS NULL OR response = 'skip') AND preference_snapshot IS NULL)
 )
);

CREATE OR REPLACE FUNCTION check_pilot_response() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 saved jsonb;
 profile jsonb;
 quizzes jsonb;
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.response IS NOT NULL AND
    (NEW.response, NEW.preference_snapshot, NEW.responded_at) IS DISTINCT FROM
    (OLD.response, OLD.preference_snapshot, OLD.responded_at) THEN
   RAISE EXCEPTION 'Pilot response is already recorded';
 END IF;
 IF NEW.response IS NULL THEN RETURN NEW; END IF;

 SELECT p.quiz_answers, p.preferences, v.definition->'quizzes' INTO saved, profile, quizzes
 FROM pilot_participants p JOIN pilot_versions v ON v.id=p.version
 WHERE p.version=NEW.version AND p.user_id=NEW.user_id;
 IF saved IS NULL OR EXISTS (SELECT FROM jsonb_array_elements(quizzes) q WHERE NOT (saved ? (q->>'id'))) THEN
   RAISE EXCEPTION 'Complete all pilot quizzes before responding';
 END IF;
 IF NEW.response IN ('yes', 'no') AND (profile = '{}'::jsonb OR NEW.preference_snapshot IS DISTINCT FROM profile) THEN
   RAISE EXCEPTION 'Pilot label requires the completed preference profile';
 END IF;
 RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER pilot_response_gate BEFORE INSERT OR UPDATE ON pilot_assignments
 FOR EACH ROW EXECUTE FUNCTION check_pilot_response();
COMMIT;
