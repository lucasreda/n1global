-- Criar tabela sync_sessions para persistir estado de sincronizações completas
CREATE TABLE IF NOT EXISTS sync_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id VARCHAR NOT NULL UNIQUE,
  
  is_running BOOLEAN NOT NULL DEFAULT true,
  phase TEXT NOT NULL DEFAULT 'preparing',
  message TEXT,
  current_step TEXT,
  
  overall_progress INTEGER NOT NULL DEFAULT 0,
  platform_progress JSONB,
  
  errors INTEGER NOT NULL DEFAULT 0,
  
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_user_id ON sync_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_run_id ON sync_sessions(run_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_is_running ON sync_sessions(is_running) WHERE is_running = true;

