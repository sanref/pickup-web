/**
 * Inspección de solo lectura de la base (npm run db:inspect):
 * versión, extensiones, esquema neon_auth y tablas propias en public.
 */
import pg from "pg";
import { withVerifyFullSsl } from "./lib/ssl.mts";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("Falta DATABASE_URL_UNPOOLED en .env.local");

const client = new pg.Client({ connectionString: withVerifyFullSsl(url) });
await client.connect();
try {
  await client.query("set default_transaction_read_only = on");
  const q = async (sql: string) => (await client.query(sql)).rows;

  const [info] = await q(
    "select current_database() as db, current_user as usr, split_part(version(), ' on ', 1) as version",
  );
  console.log(`Base: ${new URL(url).hostname}/${info.db} · usuario ${info.usr}\n${info.version}\n`);

  console.log("Extensiones instaladas:");
  for (const r of await q("select extname, extversion from pg_extension order by 1")) {
    console.log(`  ${r.extname} ${r.extversion}`);
  }
  const avail = await q(
    "select name, default_version from pg_available_extensions where name in ('postgis', 'pg_trgm') order by 1",
  );
  console.log(`Disponibles: ${avail.map((r) => `${r.name} ${r.default_version}`).join(", ") || "(ninguna de postgis/pg_trgm)"}\n`);

  const schemas = await q(
    "select nspname from pg_namespace where nspname not like 'pg_%' and nspname <> 'information_schema' order by 1",
  );
  console.log(`Esquemas: ${schemas.map((r) => r.nspname).join(", ")}`);

  const authCols = await q(`
    select table_name, column_name, data_type
      from information_schema.columns
     where table_schema = 'neon_auth' and column_name = 'id'
     order by table_name`);
  if (authCols.length) {
    console.log("\nneon_auth · tipo de las columnas id:");
    for (const r of authCols) console.log(`  ${r.table_name}.id → ${r.data_type}`);
    const userCols = await q(`
      select column_name, data_type from information_schema.columns
       where table_schema = 'neon_auth' and table_name = 'user' order by ordinal_position`);
    if (userCols.length) {
      console.log(`neon_auth.user: ${userCols.map((r) => `${r.column_name}:${r.data_type}`).join(", ")}`);
    }
  } else {
    console.log("\nNo existe el esquema neon_auth (Neon Auth no está activado en esta rama/base).");
  }

  const tables = await q(`
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','p')
       and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
     order by 1`);
  console.log(`\nTablas propias en public: ${tables.map((r) => r.relname).join(", ") || "(ninguna)"}`);
} finally {
  await client.end();
}
