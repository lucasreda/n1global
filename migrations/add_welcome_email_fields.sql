-- Add language to operations
ALTER TABLE operations ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';

-- Add welcome email fields to integration_configs
ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS app_login_url TEXT;
ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS welcome_email_enabled BOOLEAN DEFAULT true;


