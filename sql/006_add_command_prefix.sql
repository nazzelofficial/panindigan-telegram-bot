-- Add command_prefix column to chat_settings for per-chat command prefixes
BEGIN;

ALTER TABLE chat_settings
  ADD COLUMN IF NOT EXISTS command_prefix VARCHAR(50) DEFAULT NULL;

COMMIT;
