import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Aplicando migração: add_platform_order_ids.sql');
    
    // Ler arquivo SQL
    const migrationPath = join(__dirname, '..', 'migrations', 'add_platform_order_ids.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Executar migração
    await pool.query(sql);
    
    console.log('✅ Migração aplicada com sucesso!');
    
    // Verificar se as colunas foram criadas
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('cartpanda_order_id', 'digistore_order_id', 'digistore_transaction_id')
      ORDER BY column_name;
    `);
    
    console.log('📋 Colunas criadas:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();

