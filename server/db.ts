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

export const db = drizzle(pool, { schema });