-- Group rules table
BEGIN;

CREATE TABLE IF NOT EXISTS group_rules (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  rules_text TEXT,
  updated_by INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
