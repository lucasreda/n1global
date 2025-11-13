-- Add preferred_language to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT;




