/**
 * Post-proceso de `drizzle-kit pull` (lo corre `npm run db:pull`).
 *  - Reemplaza las columnas geography (que drizzle-kit no reconoce) por geographyPoint.
 *  - Lee los timestamps como Date en lugar de string.
 *  - Borra la migración y el snapshot que genera drizzle-kit: el esquema se evoluciona
 *    con db/evolution, no con migraciones de Drizzle.
 */
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "..", "src", "server", "db", "generated");
const SCHEMA = path.join(DIR, "schema.ts");

let schema = (await readFile(SCHEMA, "utf8")).replace(/\r\n/g, "\n");

const geographyPattern = /[ \t]*\/\/ TODO: failed to parse database type 'geography'\n([ \t]*)(\w+): unknown\("(\w+)"\)/g;
let geographyColumns = 0;
schema = schema.replace(geographyPattern, (_m, indent: string, prop: string, column: string) => {
  geographyColumns++;
  return `${indent}${prop}: geographyPoint("${column}")`;
});

const unknownLeft = schema.match(/\/\/ TODO: failed to parse database type '([^']+)'/g);
if (unknownLeft) {
  throw new Error(`Tipos sin mapear en schema.ts: ${unknownLeft.join(", ")}. Agregalos a custom-types.ts y a este script.`);
}

schema = schema.replace(/(timestamp\([^)]*mode: )'string'/g, "$1'date'");

// Las FKs cruzadas (matches ↔ match_slots) generan una referencia circular de tipos.
// Anotar el retorno de los callbacks de configuración de tabla corta el ciclo sin perder tipos de columnas.
schema = schema.replace(/\}, \(table\) => \[/g, "}, (table): PgTableExtraConfigValue[] => [");

const header =
  "/* eslint-disable */\n" +
  "// GENERADO por `npm run db:pull` a partir de la base. No editar a mano:\n" +
  "// los cambios de esquema van en db/evolution y después se regenera este archivo.\n" +
  'import type { PgTableExtraConfigValue } from "drizzle-orm/pg-core"\n';
const customImport = 'import { geographyPoint } from "../custom-types"\n';
schema = header + (geographyColumns > 0 ? customImport : "") + schema;

await writeFile(SCHEMA, schema);

for (const entry of await readdir(DIR)) {
  if (entry.endsWith(".sql") || entry === "meta") {
    await rm(path.join(DIR, entry), { recursive: true, force: true });
  }
}

console.log(`✓ schema.ts post-procesado (${geographyColumns} columnas geography).`);
