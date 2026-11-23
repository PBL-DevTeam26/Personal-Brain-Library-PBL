BEGIN;
CREATE TABLE IF NOT EXISTS app_instance (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 id uuid NOT NULL DEFAULT gen_random_uuid()
);
INSERT INTO app_instance(singleton) VALUES(true) ON CONFLICT(singleton) DO NOTHING;
COMMIT;
