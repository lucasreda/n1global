import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const { Pool } = pkg;

// Configuração para Supabase com pooler (porta 6543)
// Funciona perfeitamente com Railway e qualquer Postgres
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // 10s timeout
  idleTimeoutMillis: 30000, // 30s idle
  max: 20, // máximo de conexões no pool
});

// Tratamento de erros do pool para evitar crash do servidor
pool.on('error', (err: Error & { code?: string; severity?: string }) => {
  console.error('❌ Erro inesperado no pool de conexões do banco de dados:', err.message);
  if (err.code) console.error('   Código:', err.code);
  if (err.severity) console.error('   Severidade:', err.severity);
  
  // Erros de terminação do banco são comuns e não devem quebrar o servidor
  if (err.message.includes('db_termination') || err.message.includes('shutdown')) {
    console.warn('⚠️ Conexão do banco foi encerrada. O pool tentará reconectar automaticamente.');
    return;
  }
  
  // Não re-throw - apenas loga o erro
  // O pool vai tentar reconectar automaticamente
});

// Tratamento de erros de conexão individual
pool.on('connect', (client: any) => {
  client.on('error', (err: Error) => {
    console.error('❌ Erro na conexão individual do banco:', err.message);
    // Não re-throw - o pool vai gerenciar essa conexão
  });
});

export const db = drizzle(pool, { schema });