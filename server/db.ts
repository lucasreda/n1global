import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import dns from "dns";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const { Pool } = pkg;

// Forçar resolução DNS para IPv4 apenas (resolve problema de IPv6 no Railway)
// Requer NODE_OPTIONS="--dns-result-order=ipv4first" nas variáveis de ambiente
dns.setDefaultResultOrder('ipv4first');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  // Configurações para evitar timeouts em produção
  connectionTimeoutMillis: 10000, // 10s timeout (padrão é 0 = infinito)
  idleTimeoutMillis: 30000, // 30s idle
  max: 20, // máximo de conexões no pool
});

export const db = drizzle({ client: pool, schema });