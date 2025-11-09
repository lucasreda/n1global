import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Usar driver HTTP do Neon (fetch-based)
// Funciona em qualquer ambiente, incluindo Railway com restrições de rede
// Usa fetch() nativo (porta 443 HTTPS) ao invés de TCP (5432) ou WebSocket
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

// Manter compatibilidade com código que usa pool.query()
export const pool = {
  query: async (text: string, params?: any[]) => {
    const result = await sql(text, params);
    return { rows: result };
  },
};