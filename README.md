# PickUp — web

App para armar partidos (fútbol, pádel, vóley…): el organizador propone sede y horarios, la gente vota y se suma hasta completar el cupo.

- Plan técnico: [docs/plan-tecnico.md](docs/plan-tecnico.md)
- Diseño (sistema Organic): [_handoff/design_handoff_pickup_mvp/](_handoff/design_handoff_pickup_mvp/README.md)

## Stack

Next.js 16 (App Router) · Tailwind v4 + shadcn/ui · Neon Postgres (PostGIS, pg_trgm) · Drizzle (solo queries) · Neon Auth.

## Puesta en marcha

Requiere Node 24.

```bash
npm install
cp .env.example .env.local   # completar con los connection strings de la rama develop de Neon
npm run db:evolve            # aplica los scripts de db/evolution
npm run db:seed -- --dev     # deportes + sedes y partidos de demo
npm run dev
```

## Base de datos

El esquema se define con **scripts SQL numerados** en `db/evolution/` (fuente de verdad). Un script aplicado no se edita: cada cambio es un script nuevo.

| Comando | Qué hace |
|---|---|
| `npm run db:status` | Lista scripts aplicados y pendientes. |
| `npm run db:evolve` | Aplica los pendientes (tabla `schema_evolution`, checksum por script). |
| `npm run db:seed [-- --dev]` | Datos de referencia (`db/seed`); con `--dev`, también demo (`db/seed-dev`: sedes y partidos, con horarios desde hoy). |
| `npm run db:rebuild -- --confirm [--dev]` | Recrea todo desde cero sobre una base **vacía** (`DATABASE_URL_REBUILD`). |
| `npm run db:pull` | Regenera `src/server/db/generated/schema.ts` desde la base (no editar a mano). |

## Calidad

```bash
npm run typecheck
npm run lint
npm test          # unitarios; los de integración corren si hay TEST_DATABASE_URL / TEST_NEON_DATABASE_URL (ver .env.example)
```
