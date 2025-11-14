import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está definida');
  console.error('DATABASE_URL:', DATABASE_URL);
  process.exit(1);
}

console.log('🔗 Conectando ao banco de dados...');

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    console.log('📦 Aplicando migração sync_sessions...');
    
    const migrationPath = join(__dirname, '..', 'migrations', 'create_sync_sessions_table.sql');
    console.log('📄 Lendo migração de:', migrationPath);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migração sync_sessions aplicada com sucesso!');
    
    // Verificar se a tabela existe
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sync_sessions'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tabela sync_sessions criada e verificada!');
    } else {
      console.error('❌ Tabela sync_sessions não foi encontrada após migração');
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
