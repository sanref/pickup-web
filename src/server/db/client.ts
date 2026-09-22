import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as relations from "./generated/relations";
import * as schema from "./generated/schema";

// Pool por WebSocket contra el endpoint pooled de Neon: soporta transacciones interactivas
// (SELECT … FOR UPDATE). Una sola instancia por proceso, reutilizada entre requests y
// entre recargas de `next dev`.
function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL (connection string pooled de Neon) en .env.local");
  }
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema: { ...schema, ...relations } });
}

type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { pickupDb?: Db };

export const db: Db = globalForDb.pickupDb ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.pickupDb = db;

export { schema };
