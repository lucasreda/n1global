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

