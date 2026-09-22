/**
 * Runner de scripts de evolución de la base.
 *
 *   npm run db:status              lista scripts aplicados y pendientes
 *   npm run db:evolve              aplica los scripts pendientes de db/evolution
 *   npm run db:seed                corre los scripts de db/seed (idempotentes)
 *   npm run db:seed -- --dev       además corre db/seed-dev (datos de demo, solo rama develop)
 *   npm run db:rebuild -- --confirm  en una base VACÍA: evolve + seed desde cero
 *
 * Conexión: DATABASE_URL_UNPOOLED (directa, sin pooler). Para rebuild se puede
 * apuntar a otra base con DATABASE_URL_REBUILD.
 *
 * Reglas:
 *  - Archivos NNNN_descripcion.sql, se aplican en orden, cada uno en su transacción.
 *  - Un script aplicado no se edita: si cambia su checksum, el runner se detiene.
 *  - Un script que no puede correr en transacción (p. ej. CREATE INDEX CONCURRENTLY)
 *    lleva en la primera línea: -- evolution: no-transaction
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { withVerifyFullSsl } from "./lib/ssl.mts";

const ROOT = path.resolve(import.meta.dirname, "..");
const EVOLUTION_DIR = path.join(ROOT, "db", "evolution");
const SEED_DIR = path.join(ROOT, "db", "seed");
const SEED_DEV_DIR = path.join(ROOT, "db", "seed-dev");
const FILE_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const LOCK_KEY = "pickup_schema_evolution";

type Script = { version: number; name: string; file: string; sql: string; checksum: string; noTransaction: boolean };
type Applied = { version: number; name: string; checksum: string; applied_at: Date };

async function loadScripts(dir: string): Promise<Script[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const scripts: Script[] = [];
  for (const file of files) {
    const match = FILE_PATTERN.exec(file);
    if (!match) throw new Error(`Nombre inválido: ${file} (se espera NNNN_descripcion.sql)`);
    // Normalizar fin de línea: el checksum no debe depender de CRLF/LF (git en Windows).
    const sql = (await readFile(path.join(dir, file), "utf8")).replace(/\r\n/g, "\n");
    scripts.push({
      version: Number(match[1]),
      name: match[2],
      file,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
      noTransaction: /^--\s*evolution:\s*no-transaction/i.test(sql),
    });
  }
  const seen = new Set<number>();
  for (const s of scripts) {
    if (seen.has(s.version)) throw new Error(`Versión duplicada: ${s.version} en ${dir}`);
    seen.add(s.version);
  }
  return scripts;
}

function describeTarget(url: string): string {
  const u = new URL(url);
  return `${u.hostname}/${u.pathname.replace(/^\//, "")}`;
}

function connectionString(command: string): string {
  const url =
    command === "rebuild" && process.env.DATABASE_URL_REBUILD
      ? process.env.DATABASE_URL_REBUILD
      : process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL_UNPOOLED en .env.local (connection string DIRECTO de Neon, sin pooler).",
    );
  }
  if (new URL(url).hostname.includes("-pooler")) {
    throw new Error("DATABASE_URL_UNPOOLED apunta al pooler. Usá el connection string directo (sin '-pooler').");
  }
  return url;
}

async function ensureEvolutionTable(client: pg.Client) {
  await client.query(`
    create table if not exists public.schema_evolution (
      version     integer primary key,
      name        text not null,
      checksum    text not null,
      applied_at  timestamptz not null default now(),
      duration_ms integer not null
    )`);
}

async function getApplied(client: pg.Client): Promise<Map<number, Applied>> {
  const { rows } = await client.query<Applied>(
    "select version, name, checksum, applied_at from public.schema_evolution order by version",
  );
  return new Map(rows.map((r) => [r.version, r]));
}

function verifyChecksums(scripts: Script[], applied: Map<number, Applied>) {
  for (const s of scripts) {
    const a = applied.get(s.version);
    if (a && a.checksum !== s.checksum) {
      throw new Error(
        `El script ${s.file} ya fue aplicado y su contenido cambió. ` +
          "Los scripts aplicados no se editan: creá uno nuevo con el cambio.",
      );
    }
  }
  const onDisk = new Set(scripts.map((s) => s.version));
  for (const a of applied.values()) {
    if (!onDisk.has(a.version)) {
      console.warn(`⚠ La versión ${a.version} (${a.name}) está aplicada pero no existe en db/evolution.`);
    }
  }
}

async function runScript(client: pg.Client, s: Script, record: boolean) {
  const started = Date.now();
  if (s.noTransaction) {
    await client.query(s.sql);
    if (record) await recordApplied(client, s, Date.now() - started);
    return;
  }
  try {
    await client.query("begin");
    await client.query(s.sql);
    if (record) await recordApplied(client, s, Date.now() - started);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

async function recordApplied(client: pg.Client, s: Script, durationMs: number) {
  await client.query(
    "insert into public.schema_evolution (version, name, checksum, duration_ms) values ($1, $2, $3, $4)",
    [s.version, s.name, s.checksum, durationMs],
  );
}

async function evolve(client: pg.Client) {
  const scripts = await loadScripts(EVOLUTION_DIR);
  const applied = await getApplied(client);
  verifyChecksums(scripts, applied);
  const pending = scripts.filter((s) => !applied.has(s.version));
  if (pending.length === 0) {
    console.log("✓ La base está al día. No hay scripts pendientes.");
    return;
  }
  for (const s of pending) {
    process.stdout.write(`→ ${s.file} ... `);
    await runScript(client, s, true);
    console.log("ok");
  }
  console.log(`✓ ${pending.length} script(s) aplicados.`);
}

async function seed(client: pg.Client, includeDev: boolean) {
  const dirs = includeDev ? [SEED_DIR, SEED_DEV_DIR] : [SEED_DIR];
  let count = 0;
  for (const dir of dirs) {
    for (const s of await loadScripts(dir)) {
      process.stdout.write(`→ ${path.basename(dir)}/${s.file} ... `);
      await runScript(client, s, false);
      console.log("ok");
      count++;
    }
  }
  console.log(`✓ ${count} script(s) de seed ejecutados.`);
}

async function status(client: pg.Client) {
  const scripts = await loadScripts(EVOLUTION_DIR);
  const applied = await getApplied(client);
  for (const s of scripts) {
    const a = applied.get(s.version);
    const mark = !a ? "pendiente" : a.checksum === s.checksum ? "aplicado " : "¡MODIFICADO!";
    const when = a ? a.applied_at.toISOString() : "";
    console.log(`${mark}  ${s.file}  ${when}`);
  }
}

async function assertEmptyDatabase(client: pg.Client) {
  // Cuenta tablas propias de public; ignora las que crean las extensiones (spatial_ref_sys, etc.).
  const { rows } = await client.query<{ n: number }>(
    `select count(*)::int as n
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and not exists (
          select 1 from pg_depend d
           where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e'
        )`,
  );
  if (rows[0].n > 0) {
    throw new Error(
      "rebuild solo corre sobre una base vacía (el esquema public tiene tablas). " +
        "Usá una rama nueva de Neon o un Postgres limpio (DATABASE_URL_REBUILD).",
    );
  }
}

async function main() {
  const [command = "evolve", ...flags] = process.argv.slice(2);
  if (!["evolve", "seed", "status", "rebuild"].includes(command)) {
    throw new Error(`Comando desconocido: ${command}. Usá evolve | seed | status | rebuild.`);
  }
  if (command === "rebuild" && !flags.includes("--confirm")) {
    throw new Error("rebuild requiere --confirm (npm run db:rebuild -- --confirm).");
  }

  const url = connectionString(command);
  const client = new pg.Client({ connectionString: withVerifyFullSsl(url) });
  await client.connect();
  console.log(`Base: ${describeTarget(url)}`);
  try {
    // Un solo runner a la vez sobre la misma base.
    await client.query("select pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
    if (command === "rebuild") await assertEmptyDatabase(client);
    await ensureEvolutionTable(client);

    if (command === "status") await status(client);
    if (command === "evolve" || command === "rebuild") await evolve(client);
    if (command === "seed" || command === "rebuild") await seed(client, flags.includes("--dev"));
  } finally {
    await client.query("select pg_advisory_unlock(hashtext($1))", [LOCK_KEY]).catch(() => {});
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
