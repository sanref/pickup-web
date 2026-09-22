import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Solo se usa para `npm run db:pull`: genera el esquema TypeScript desde la base.
// La fuente de verdad del esquema son los scripts de db/evolution; no se usan migraciones de Drizzle.
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("Falta DATABASE_URL_UNPOOLED en .env.local");

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: { url },
  out: "./src/server/db/generated",
  schemaFilter: ["public"],
  tablesFilter: ["!schema_evolution"],
  extensionsFilters: ["postgis"],
  introspect: { casing: "camel" },
});
