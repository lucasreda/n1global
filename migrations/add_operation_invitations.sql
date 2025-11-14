-- Add invitedAt and invitedBy columns to user_operation_access
ALTER TABLE "user_operation_access" 
ADD COLUMN IF NOT EXISTS "invited_at" timestamp,
ADD COLUMN IF NOT EXISTS "invited_by" varchar;

-- Add foreign key for invited_by
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_operation_access_invited_by_users_id_fk'
  ) THEN
    ALTER TABLE "user_operation_access" 
    ADD CONSTRAINT "user_operation_access_invited_by_users_id_fk" 
    FOREIGN KEY ("invited_by") 
    REFERENCES "users"("id") 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create operation_invitations table
CREATE TABLE IF NOT EXISTS "operation_invitations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "operation_id" varchar NOT NULL,
  "email" text NOT NULL,
  "invited_by" varchar NOT NULL,
  "role" text NOT NULL DEFAULT 'viewer',
  "permissions" jsonb,
  "token" varchar NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'operation_invitations_operation_id_operations_id_fk'
  ) THEN
    ALTER TABLE "operation_invitations" 
    ADD CONSTRAINT "operation_invitations_operation_id_operations_id_fk" 
    FOREIGN KEY ("operation_id") 
    REFERENCES "operations"("id") 
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'operation_invitations_invited_by_users_id_fk'
  ) THEN
    ALTER TABLE "operation_invitations" 
    ADD CONSTRAINT "operation_invitations_invited_by_users_id_fk" 
    FOREIGN KEY ("invited_by") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "operation_invitations_token_idx" 
ON "operation_invitations" ("token");

CREATE INDEX IF NOT EXISTS "operation_invitations_operation_status_idx" 
ON "operation_invitations" ("operation_id", "status");

