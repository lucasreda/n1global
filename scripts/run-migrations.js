// Script para rodar migrações automaticamente no deploy
import pkg from 'pg';
const { Pool } = pkg;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL não configurado, pulando migrações');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Verificando e aplicando migrações necessárias...');
    
    // Migração: Adicionar campos de plataformas
    console.log('📝 Aplicando: add_platform_order_ids');
    await pool.query(`
      -- Adicionar campos de identificação de plataformas de e-commerce à tabela orders
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS cartpanda_order_id TEXT,
      ADD COLUMN IF NOT EXISTS digistore_order_id TEXT,
      ADD COLUMN IF NOT EXISTS digistore_transaction_id TEXT;

      -- Criar índices para melhorar performance de busca
      CREATE INDEX IF NOT EXISTS idx_orders_cartpanda_order_id ON orders(cartpanda_order_id) WHERE cartpanda_order_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_digistore_order_id ON orders(digistore_order_id) WHERE digistore_order_id IS NOT NULL;
    `);
    
    console.log('✅ Migração add_platform_order_ids aplicada');
    
    // Verificar se as colunas foram criadas
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('cartpanda_order_id', 'digistore_order_id', 'digistore_transaction_id')
      ORDER BY column_name;
    `);
    
    console.log('📋 Colunas verificadas:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });
    
    // Migração: Criar tabela sync_sessions
    console.log('📝 Aplicando: create_sync_sessions_table');
    await pool.query(`
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
    `);
    
    console.log('✅ Migração create_sync_sessions_table aplicada');
    
    // Verificar se a tabela foi criada
    const syncSessionsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sync_sessions'
    `);
    
    if (syncSessionsCheck.rows.length > 0) {
      console.log('  ✓ sync_sessions table criada');
    }
    
    // Migração: Adicionar integration_started_at nas integrações
    console.log('📝 Aplicando: add_integration_started_at');
    await pool.query(`
      -- Shopify Integrations
      ALTER TABLE shopify_integrations 
      ADD COLUMN IF NOT EXISTS integration_started_at TIMESTAMP;

      UPDATE shopify_integrations 
      SET integration_started_at = created_at 
      WHERE integration_started_at IS NULL AND status = 'active';

      -- CartPanda Integrations
      ALTER TABLE cartpanda_integrations 
      ADD COLUMN IF NOT EXISTS integration_started_at TIMESTAMP;

      UPDATE cartpanda_integrations 
      SET integration_started_at = created_at 
      WHERE integration_started_at IS NULL AND status = 'active';

      -- Digistore24 Integrations
      ALTER TABLE digistore_integrations 
      ADD COLUMN IF NOT EXISTS integration_started_at TIMESTAMP;

      UPDATE digistore_integrations 
      SET integration_started_at = created_at 
      WHERE integration_started_at IS NULL AND status = 'active';
    `);
    
    console.log('✅ Migração add_integration_started_at aplicada');
    
    // Migração: Criar tabela big_arena_warehouse_accounts
    console.log('📝 Aplicando: create_big_arena_warehouse_accounts_table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS big_arena_warehouse_accounts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id VARCHAR NOT NULL REFERENCES user_warehouse_accounts(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation_id VARCHAR REFERENCES operations(id),
        
        api_token TEXT NOT NULL,
        api_domain TEXT,
        
        status TEXT NOT NULL DEFAULT 'active',
        last_sync_at TIMESTAMP,
        last_sync_status TEXT DEFAULT 'never',
        last_sync_cursor TEXT,
        last_sync_error TEXT,
        
        metadata JSONB,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        CONSTRAINT big_arena_warehouse_accounts_account_id_key UNIQUE (account_id)
      );

      CREATE INDEX IF NOT EXISTS big_arena_accounts_user_idx ON big_arena_warehouse_accounts(user_id);
      CREATE INDEX IF NOT EXISTS big_arena_accounts_operation_idx ON big_arena_warehouse_accounts(operation_id);
      CREATE INDEX IF NOT EXISTS big_arena_accounts_status_idx ON big_arena_warehouse_accounts(status);
    `);
    
    console.log('✅ Migração create_big_arena_warehouse_accounts_table aplicada');
    
    // Verificar se a tabela foi criada
    const bigArenaCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'big_arena_warehouse_accounts'
    `);
    
    if (bigArenaCheck.rows.length > 0) {
      console.log('  ✓ big_arena_warehouse_accounts table criada');
    }
    
    // Migração: Criar tabelas staging do Big Arena (orders, products, etc.)
    console.log('📝 Aplicando: create_big_arena_staging_tables');
    const fs = await import('fs');
    const path = await import('path');
    const stagingTablesSQL = fs.readFileSync(
      path.join(process.cwd(), 'migrations', 'add_big_arena_staging_tables.sql'),
      'utf8'
    );
    await pool.query(stagingTablesSQL);
    console.log('✅ Migração create_big_arena_staging_tables aplicada');
    
    // Verificar se as tabelas foram criadas
    const stagingTablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN (
        'big_arena_orders',
        'big_arena_order_returns',
        'big_arena_products',
        'big_arena_product_variants',
        'big_arena_shipments',
        'big_arena_warehouses',
        'big_arena_couriers',
        'big_arena_courier_nomenclatures'
      )
      ORDER BY table_name;
    `);
    
    if (stagingTablesCheck.rows.length > 0) {
      console.log('  ✓ Tabelas Big Arena staging criadas:');
      stagingTablesCheck.rows.forEach(row => {
        console.log(`    ✓ ${row.table_name}`);
      });
    }
    
    console.log('✅ Todas as migrações aplicadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migrações:', error);
    // Não falhar o deploy por causa de migrações
    console.log('⚠️ Continuando deploy mesmo com erro na migração');
  } finally {
    await pool.end();
  }
}

runMigrations();

