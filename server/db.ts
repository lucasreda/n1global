import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  // Configurações para evitar timeouts em produção
  connectionTimeoutMillis: 10000, // 10s timeout (padrão é 0 = infinito)
  idleTimeoutMillis: 30000, // 30s idle
  max: 20, // máximo de conexões no pool
  // Forçar IPv4 para evitar tentativas IPv6 que falham no Railway
  family: 4, // 4 = IPv4 only, 6 = IPv6 only, 0 = both (padrão)
});
export const db = drizzle({ client: pool, schema });