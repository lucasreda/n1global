-- Criar tabela polling_executions para rastrear execuções de polling automático
CREATE TABLE IF NOT EXISTS "polling_executions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "operation_id" varchar,
  "provider" text NOT NULL,
  "executed_at" timestamp NOT NULL DEFAULT now(),
  "orders_found" integer DEFAULT 0,
  "orders_processed" integer DEFAULT 0,
  "success" boolean NOT NULL DEFAULT true,
  "error_message" text,
  "created_at" timestamp DEFAULT now()
);

-- Criar índice composto para busca eficiente
CREATE INDEX IF NOT EXISTS "polling_executions_operation_provider_idx" 
  ON "polling_executions" ("operation_id", "provider", "executed_at" DESC);

-- Adicionar foreign key
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'polling_executions_operation_id_operations_id_fk'
  ) THEN
    ALTER TABLE "polling_executions" 
    ADD CONSTRAINT "polling_executions_operation_id_operations_id_fk" 
    FOREIGN KEY ("operation_id") 
    REFERENCES "operations"("id") 
    ON DELETE CASCADE;
  END IF;
END $$;

