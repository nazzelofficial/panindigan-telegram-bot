-- Maintenance schedule and broadcast metadata helpers
BEGIN;

CREATE TABLE IF NOT EXISTS maintenance_state (
  id SERIAL PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT FALSE,
  message TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure a single row exists
INSERT INTO maintenance_state (id, is_enabled) SELECT 1, FALSE WHERE NOT EXISTS (SELECT 1 FROM maintenance_state WHERE id = 1);

-- Broadcasts table already exists in 001_init.sql; keep metadata indexes
CREATE INDEX IF NOT EXISTS broadcasts_status_idx ON broadcasts(status);

COMMIT;
