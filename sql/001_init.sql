-- Initial schema for Panindigan Bot
BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE,
  language VARCHAR(10) DEFAULT 'fil',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_levels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chat_id BIGINT,
  level INTEGER DEFAULT 1,
  xp BIGINT DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_xp_gained TIMESTAMPTZ,
  rank INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welcome_goodbye_config (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  is_welcome_enabled BOOLEAN DEFAULT TRUE,
  is_goodbye_enabled BOOLEAN DEFAULT TRUE,
  welcome_message TEXT,
  goodbye_message TEXT,
  background_image TEXT,
  text_color VARCHAR(7) DEFAULT '#FFFFFF',
  font_family TEXT DEFAULT 'Arial',
  updated_by INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warnings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id),
  reason TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq (
  id SERIAL PRIMARY KEY,
  question TEXT,
  answer TEXT,
  keywords TEXT[],
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  reference_number TEXT UNIQUE,
  user_id INTEGER REFERENCES users(id),
  category TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending',
  upvote_count INTEGER DEFAULT 0,
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestion_upvotes (
  id SERIAL PRIMARY KEY,
  suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suggestion_id, user_id)
);

CREATE TABLE IF NOT EXISTS nsfw_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  chat_id BIGINT,
  file_id TEXT,
  confidence_score REAL,
  action_taken TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id SERIAL PRIMARY KEY,
  header TEXT,
  message TEXT,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  badge_key TEXT UNIQUE,
  name TEXT,
  description TEXT,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  badge_id INTEGER REFERENCES badges(id),
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by INTEGER
);

CREATE TABLE IF NOT EXISTS mutes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  chat_id BIGINT,
  muted_by INTEGER,
  reason TEXT,
  muted_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS daily_rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  xp_earned INTEGER,
  streak_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id),
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
