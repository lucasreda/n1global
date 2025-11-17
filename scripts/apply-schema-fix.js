// Script para aplicar correções de schema removendo colunas obsoletas
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function applySchemaFix() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL não configurado');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Aplicando correções de schema...');
    
    // Remover colunas obsoletas que não estão mais no schema
    console.log('📝 Removendo coluna preferred_language da tabela users');
    await pool.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS preferred_language;
    `);
    
    console.log('📝 Removendo colunas invited_at e invited_by da tabela user_operation_access');
    await pool.query(`
      ALTER TABLE user_operation_access DROP COLUMN IF EXISTS invited_at;
      ALTER TABLE user_operation_access DROP COLUMN IF EXISTS invited_by;
    `);
    
    console.log('✅ Correções de schema aplicadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar correções:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applySchemaFix();

