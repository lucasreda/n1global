import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configurar WebSocket para ambientes Node.js (Railway)
// O driver serverless do Neon usa WebSocket (porta 443) ao invés de TCP direto (porta 5432)
// Isso resolve o problema de bloqueio de porta 5432 no Railway
if (process.env.NODE_ENV === "production") {
  neonConfig.webSocketConstructor = ws;
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Configurações para evitar timeouts
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

export const db = drizzle({ client: pool, schema });