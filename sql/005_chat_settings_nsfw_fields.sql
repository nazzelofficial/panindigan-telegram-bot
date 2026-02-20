-- Extend chat_settings with NSFW-specific config fields
BEGIN;

ALTER TABLE chat_settings
  ADD COLUMN IF NOT EXISTS nsfw_threshold REAL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS nsfw_delete_on_detect BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS nsfw_notify_user BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS nsfw_auto_warn BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS nsfw_auto_ban_after_warnings INTEGER DEFAULT 3;

COMMIT;
