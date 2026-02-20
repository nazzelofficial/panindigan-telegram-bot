-- Quotes table for saving memorable messages
BEGIN;

CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  message_id INTEGER NOT NULL,
  author_id BIGINT,
  author_name TEXT,
  quote_text TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
