import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada!');
    console.error('💡 Dica: Crie um arquivo .env na raiz do projeto com:');
    console.error('   DATABASE_URL=postgresql://usuario:senha@host/database');
    console.error('');
    console.error('📖 Veja SETUP_DATABASE.md para mais informações');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Aplicando migração: add_operation_invitations.sql');
    
    // Ler arquivo SQL
    const migrationPath = join(__dirname, '..', 'migrations', 'add_operation_invitations.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Executar migração
    await pool.query(sql);
    
    console.log('✅ Migração aplicada com sucesso!');
    
    // Verificar se as colunas foram criadas
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_operation_access' 
      AND column_name IN ('invited_at', 'invited_by')
      ORDER BY column_name;
    `);
    
    console.log('📋 Colunas adicionadas à user_operation_access:');
    columnsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });

    // Verificar se a tabela operation_invitations foi criada
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'operation_invitations'
      );
    `);
    
    if (tableResult.rows[0].exists) {
      console.log('✅ Tabela operation_invitations criada com sucesso!');
    } else {
      console.log('⚠️ Tabela operation_invitations não foi criada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
