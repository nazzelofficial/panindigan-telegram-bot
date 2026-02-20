-- Reports and extended FAQ support
BEGIN;

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id),
  reported_user_id INTEGER REFERENCES users(id),
  chat_id BIGINT,
  message_id BIGINT,
  category TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure faq table exists (already created in 001_init.sql) but add index for keywords search if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'faq_keywords_idx') THEN
    CREATE INDEX IF NOT EXISTS faq_keywords_idx ON faq USING GIN (keywords);
  END IF;
END$$;

COMMIT;
