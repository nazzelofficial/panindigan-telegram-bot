-- Add date_of_birth and age verification fields to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL,
  ADD COLUMN IF NOT EXISTS is_age_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP WITH TIME ZONE NULL;
