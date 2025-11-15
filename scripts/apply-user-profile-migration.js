import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';

// Initialize database connection (same as server/db.ts)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada!');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function applyMigration() {
  try {
    console.log('📦 Aplicando migration: add_user_profile_fields...');
    
    // Add phone column
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
    console.log('✅ Coluna phone adicionada');
    
    // Add avatar_url column
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    console.log('✅ Coluna avatar_url adicionada');
    
    // Add updated_at column if not exists
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('✅ Coluna updated_at adicionada');
    
    console.log('✅ Migration aplicada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    process.exit(1);
  }
}

applyMigration();

