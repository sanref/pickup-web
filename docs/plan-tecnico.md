# PickUp: análisis técnico y plan del MVP web

## Contexto

Querés una app para que la gente que quiere jugar un deporte (fútbol 5, vóley, pádel, tenis, etc.) y no llega a juntar a todos los jugadores encuentre a otras personas que busquen lo mismo. Un organizador arma un partido: elige la sede, propone varias fechas y horarios, y los interesados se suman y marcan qué opciones les sirven. La versión 1 es solo web, pero tiene que quedar lista para una app mobile más adelante. El proyecto arranca de cero:
- La app web va en `C:\fer\Proyects\PickUp\web\`.
- `mobile\` queda reservada para la app futura.
- En `web\_handoff\design_handoff_pickup_mvp\` está el **handoff de diseño**: seis pantallas en alta fidelidad y el sistema de diseño **Organic**. Es la base visual obligatoria (ver sección 2.2).
- La cuenta de Neon ya está creada. La base se construye **directamente en Neon** y en paralelo se mantienen **scripts de evolución SQL** que la recrean desde cero (ver sección 3.1).
- En la máquina hay Node 24, npm, git y Docker. No hay `psql`: los scripts se corren con un runner en Node.

**Decisiones que tomaste:**
- **Equipo** = el grupo de personas que juega un partido. Puede ser de una sola vez o mantenerse en el tiempo.
- **Horarios**: votación tipo Doodle sobre opciones concretas de fecha y hora.
- **Sedes**: un catálogo verificado, más las sedes que proponen los usuarios.
- **Infraestructura**: **Neon** (Postgres serverless) y Next.js en Vercel.
- **Autenticación**: **Neon Auth** (Better Auth administrado por Neon).
- **Usuarios**: cada persona tiene su cuenta y entra con **Google** o con **email y contraseña**. Sin iniciar sesión se pueden ver los partidos públicos; para sumarse, votar o crear hay que iniciar sesión.

---

## 1. Modelo de dominio

| Concepto | Qué es |
|---|---|
| **Deporte** | Fútbol 5, Fútbol 7, Pádel, Tenis singles o dobles, Vóley… Cada uno tiene un cupo por defecto (10, 14, 4, 2/4, 12). |
| **Sede** | Una cancha o club con ubicación geográfica y los deportes que ofrece. Puede estar `verified` (catálogo) o `pending` (la propuso un usuario). |
| **Partido** (convocatoria) | La entidad central: deporte, sede, cupo, nivel, precio por persona, visibilidad y varias **opciones de horario**. |
| **Opción de horario** | Una fecha y hora concreta que propone el organizador (`starts_at`, `ends_at`). |
| **Voto** | "Esta opción me sirve". Cada usuario marca una o varias opciones. |
| **Participante** | Un usuario que se sumó a un partido. Su estado es `interested`, `confirmed`, `waitlist` o `left`. |
| **Equipo** | En la interfaz, el equipo son los participantes del partido. Si el organizador lo **guarda**, pasa a ser un equipo persistente (`teams` + `team_members`) que puede volver a convocarse. |

### Ciclo de vida de un partido

```
draft ──publicar──► open (votación) ──confirmar opción──► confirmed ──(fecha pasada, cron)──► played
                       │                                      │
                       └──────────── cancelar ────────────────┴──► cancelled
```

**Reglas de negocio clave:**
1. **Crear.** El organizador crea el partido con 1 a N opciones y queda como primer participante. Puede invitar gente con un link (`/i/[code]`). En los partidos públicos, el listado muestra **"faltan X"**.
2. **Votar.** Estando `open`, cualquiera se suma como `interested` y marca las opciones que le sirven. Cada opción muestra el conteo de votos contra el cupo.
3. **Quórum.** Cuando una opción llega al cupo, se avisa al organizador. Si activó `auto_confirm`, el partido se confirma solo.
4. **Confirmar.** El organizador puede confirmar una opción aunque no haya llegado al cupo. Al confirmar:
   - Los que votaron esa opción pasan a `confirmed`, por orden de voto, hasta llenar el cupo. El resto queda en `waitlist`.
   - Los que no votaron esa opción reciben un aviso y pueden sumarse si queda lugar.
   - Si queda lugar, el partido sigue en el listado público con "faltan X".
5. **Bajas.** Si un confirmado se baja, el primero de la lista de espera pasa a confirmado automáticamente y se le avisa.
6. **Cierre.** Una tarea programada marca como `played` los partidos cuya fecha ya pasó. Ahí se le ofrece al organizador **"Guardar este equipo"**, que crea un `team` con los confirmados.
7. **Equipo persistente.** Con "Nuevo partido con este equipo", los miembros quedan invitados y marcados como `interested`. Solo los lugares libres se publican.

---

## 2. Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| Frontend y backend | **Next.js (App Router, TypeScript)** en **Vercel** (funciones en la región `gru1`, São Paulo) | Ya lo conocés. Server Components para las lecturas y Server Actions para las mutaciones. |
| Base de datos | **Neon Postgres + PostGIS + pg_trgm**, en la región **AWS São Paulo** (`sa-east-1`) | Búsquedas geográficas y detección de sedes duplicadas por nombre, con baja latencia desde Argentina. Con la **integración Neon ↔ Vercel**, cada deploy de preview tiene su propia rama de la base. |
| Driver | `@neondatabase/serverless` (`Pool` por WebSocket), contra el endpoint **pooled** | Soporta transacciones interactivas, necesarias para `SELECT … FOR UPDATE`. |
| Esquema y queries | **Scripts de evolución SQL** (fuente de verdad) + **Drizzle ORM** solo para las queries | El esquema se escribe en SQL plano y versionado (sección 3.1). `drizzle-kit pull` genera desde la base el esquema TypeScript tipado para las queries. No se usan las migraciones de Drizzle. |
| Autenticación | **Neon Auth** (SDK `@neondatabase/auth`) | Better Auth administrado. Los usuarios quedan en el esquema `neon_auth` de tu base y cada rama tiene su auth aislado. Es gratis hasta 60.000 usuarios activos por mes. Ver la sección 2.1. |
| Lógica y autorización | **Capa de servicios en TS** (`src/server/services`) | Todas las lecturas y escrituras pasan por servicios que reciben al usuario (`actor`) y chequean permisos. Las Server Actions de la web y, más adelante, una API para mobile usan los mismos servicios. |
| Tiempo real | **Polling** del detalle del partido (cada 5 a 10 s, solo con la pestaña visible) y del contador de notificaciones | Neon no trae tiempo real. Para el volumen de un MVP alcanza, y más adelante se puede sumar Pusher o Ably. |
| Archivos | **Vercel Blob** | Avatares y fotos de sedes, subidos directo desde el navegador con un token firmado. |
| Tareas programadas | **Vercel Cron** → `/api/cron/*` | Ver la sección 4. |
| Interfaz | **Tailwind v4 + shadcn/ui** re-tematizado con Organic, `react-hook-form` + `zod`, iconos **Lucide** (`stroke-width 2.75`) | Ver la sección 2.2. |
| Mapas | **Google Maps Platform** (Places Autocomplete (New) + Maps JS) | Es lo que mejor cubre canchas chicas en Latinoamérica. Las condiciones de Google exigen mostrar sus datos en un mapa de Google. |
| Email | **Resend** + React Email | Emails de auth en español (vía webhook de Neon Auth) y notificaciones de partidos. |
| Fechas | `timestamptz` en la base y `date-fns-tz` | Todo se guarda en UTC y se muestra en la zona horaria de la sede. |
| Instalable | Manifest PWA | Se puede instalar en el celular antes de tener una app nativa. |
| Compartir | Imágenes OG dinámicas (`next/og`) por partido | El link que se comparte por WhatsApp muestra una tarjeta con "Fútbol 5 · Sede X · faltan 3". |

### 2.1 Usuarios y autenticación (Neon Auth)

**Configuración en la consola de Neon** (por proyecto; cada rama hereda un auth aislado):
- Métodos: **email y contraseña** con verificación **obligatoria**, y **Google OAuth**. En desarrollo se pueden usar las credenciales de prueba que da Neon; en producción, un OAuth client propio de Google Cloud.
- **Verificación por código (OTP)**, no por link: es el método que se puede personalizar por webhook.
- Vinculación de cuentas activada: si alguien se registró con email y después entra con Google usando el mismo correo, queda una sola cuenta.
- **Trusted domains**: el dominio de producción y los de las previews de Vercel.
- Plugin **Admin** activado: agrega el campo `role` y permite banear usuarios.

**Emails de auth en español**
- En desarrollo se usa el remitente por defecto de Neon, que es compartido y viene con plantillas en inglés. Alcanza para trabajar.
- En staging y producción:
  - Se configura el **SMTP de Resend** como proveedor propio, para tener remitente y entregabilidad propios.
  - Se suscribe el **webhook `send.otp`** a `/api/webhooks/neon-auth`. Con eso Neon deja de mandar su mail y el handler manda el código con **plantillas propias en español** (React Email + Resend).
  - El handler valida la firma del webhook y tiene que responder rápido: el webhook bloquea el flujo de login, con un límite de 15 s entre todos los reintentos.
- ⚠️ **A validar en la fase 2:** si el email de "olvidé mi contraseña" se puede personalizar de la misma forma. La alternativa es hacer la recuperación por código OTP, que pasa por el mismo webhook.

**Sesión en Next**
- `createNeonAuth` (`@neondatabase/auth/next/server`) y el route handler del SDK, siguiendo el quickstart de Next.js de Neon.
- Helper `requireUser()`: obtiene la sesión en Server Components, Server Actions y route handlers, y si no hay sesión redirige a `/login?next=…`.
- `middleware.ts` (`proxy.ts` en Next 16) solo hace una redirección optimista según la cookie. La validación real se hace en cada página y en cada acción.
- Cerrar sesión desde el menú del usuario.

**Registro y perfil**
- Los usuarios viven en `neon_auth.user`, administrada por Neon. Drizzle la **lee pero no la migra**: se trae con `drizzle-kit pull` y `schemaFilter: ['public']` deja fuera de las migraciones todo lo que no sea el esquema `public`.
- `profiles` se relaciona 1:1 con el usuario. Se crea con `ensureProfile()` la primera vez que el usuario entra al área logueada, con el nombre y el avatar de Google si los hay. Es idempotente y no depende de webhooks.
- Si el perfil está incompleto (sin ciudad o sin deportes), el layout del área logueada redirige a `/onboarding`.
- En `/perfil` cada usuario edita su nombre, su avatar (que se sube a Vercel Blob), su ciudad, sus deportes y su nivel. También puede cambiar la contraseña.
- `/perfil/[id]` muestra el perfil público, sin email y sin datos de contacto.
- **Eliminar cuenta:** una Server Action anonimiza el perfil, da de baja al usuario de sus partidos futuros y borra el usuario de Neon Auth. ⚠️ **A validar en la fase 2** si ese borrado se hace con el plugin Admin o con la API de Neon.

**Acceso sin login y con login**

| Acción | Sin login | Con login |
|---|---|---|
| Ver la landing, explorar y ver un partido o sede pública | ✅ | ✅ |
| Ver los nombres de los participantes | Solo nombre de pila y avatar | ✅ |
| Sumarse, votar o crear un partido | → `/login?next=/partidos/[id]` | ✅ |
| Proponer una sede, ver "Mis partidos" o "Mis equipos" | → login | ✅ |
| Ver el link de contacto (grupo de WhatsApp) | ❌ | Solo si es confirmado |
| Panel de admin | ❌ | Solo con `role = admin` |

El parámetro `next` hace que, después de iniciar sesión o de verificar el email, el usuario vuelva al partido que estaba mirando.

**Seguridad**
- Neon Auth maneja el hashing de contraseñas y la protección de sus propios endpoints.
- No hay plugin de captcha. Si aparecen bots, el webhook bloqueante `user.before_create` sirve para rechazar registros (por ejemplo, de dominios de email descartables).
- `DATABASE_URL`, las claves de Resend y de Blob, y el secreto del webhook se usan solo en el servidor (`import 'server-only'`).
- Las Server Actions son endpoints públicos, así que cada una valida la sesión y valida el input con zod.

**Restricciones de Neon Auth que aceptamos**
- No se pueden usar hooks ni plugins propios de Better Auth; solo los que expone Neon.
- La versión de Better Auth la maneja Neon.
- Solo corre en regiones de AWS.
- Todavía no soporta frontend y backend en deploys separados, y Expo no figura en su roadmap. Si al llegar a mobile no está soportado, se migra a **Better Auth propio**: es la misma librería y los datos ya están en tu base.

### 2.2 Diseño (handoff Organic)

Fuente: `pickup-web/_handoff/design_handoff_pickup_mvp/`.
- `README.md` tiene la especificación de cada pantalla y componente.
- `PickUp-pantallas-MVP.html` es la referencia visual. **No se copia**: las pantallas se recrean con los componentes del proyecto.
- `styles.css` tiene los tokens y es la única fuente de verdad literal.

**Tokens**
- Los valores de `styles.css` se trasladan tal cual a `src/app/globals.css`: colores con sus rampas 100–900, `--space-*`, `--radius-*` y `--shadow-*`.
- En Tailwind v4 se exponen con `@theme` en el mismo CSS (no hay `tailwind.config.ts`). Así existen clases como `bg-accent-2-100` y `rounded-lg`.
- **No se inventan valores nuevos.**

**Tipografía:** Caprasimo 400 para títulos y Figtree 400/600/700 para texto, con `next/font/google`.

**Reglas del producto**
- Terracota solo para lo que empuja a actuar; salvia para lo resuelto.
- Todo va redondeado: botones, tags e inputs en píldora de 999px, tarjetas de 16px y contenedores de 28px.
- Foco con outline terracota de 2px.
- Estados de carga con esqueletos, sin spinners.

**shadcn/ui re-tematizado:** Button, Badge, Input, Label, Form, Tabs y ToggleGroup (segmented), Card, Avatar, Slider, Dialog, Sonner y Progress.

**Componentes propios** en `src/components/match/`: `SlotPollGrid`, `CapacityBar`, `StatusTag`, `MissingCount`, `AvatarStack`, `MatchCard`, `VenueMap` y `VenuePicker`.

**Pantallas diseñadas:** `/`, `/explorar`, `/partidos/[id]`, `/mis-partidos`, `/login` y `/registro`, `/onboarding` y `/perfil`.

**Pantallas sin diseñar**, que se hacen con el mismo sistema: `/partidos/nuevo`, `/partidos/[id]/gestionar`, `/equipos`, `/i/[code]`, `/admin/*` y las pantallas de verificación y recuperación.

**Diferencias con el handoff**, que se escribió pensando en Supabase:
- Donde dice Realtime se usa **polling**. El pie de la grilla dice "en vivo" con el punto salvia.
- Donde dice RPC `set_votes` o `search_matches` se usan los servicios `setVotes` y `searchMatches`.
- El toggle de voto sigue siendo optimista, con rollback y toast si falla.

**Responsive:** se aplican las reglas de colapso del README. Debajo de 700px, `SlotPollGrid` pasa a la vista de opciones apiladas (una tarjeta por horario). Los hit targets son de 44px o más en mobile.

---

## 3. Modelo de datos (Postgres en Neon)

### 3.1 Scripts de evolución

- **Carpeta:** `pickup-web/db/evolution/`, con archivos numerados que no se editan una vez aplicados:
  - `0001_extensions.sql` (postgis, pg_trgm)
  - `0002_enums.sql`
  - `0003_core_tables.sql`
  - `0004_matches.sql`
  - `0005_indexes.sql`
  - …
- **Cada cambio de esquema es un script nuevo.** Primero se aplica en la rama `develop` de Neon y después en `production`.
- **Datos de referencia:** `pickup-web/db/seed/` (deportes, sedes de la ciudad piloto). Son scripts idempotentes con `ON CONFLICT DO NOTHING`.
- **Runner en Node:** `pickup-web/scripts/db-evolve.ts`, con `pg` y la conexión **directa** (sin pooler).
  - Crea la tabla `public.schema_evolution (version, name, checksum, applied_at)` y aplica en orden los scripts pendientes, cada uno en una transacción.
  - Frena si el checksum de un script ya aplicado cambió.
- **Comandos:**
  - `npm run db:evolve`: aplica lo pendiente.
  - `npm run db:seed`: carga los datos de referencia.
  - `npm run db:rebuild -- --confirm`: en una base vacía, aplica todo desde cero más el seed. Sirve para verificar que los scripts recrean la base.
  - `npm run db:pull`: regenera el esquema Drizzle (`src/server/db/schema.ts`).
- **Portabilidad:** los scripts **no crean FKs hacia `neon_auth`**. Solo `profiles.user_id` es una referencia lógica a `neon_auth.user(id)`; todas las demás tablas referencian a `profiles(user_id)` con FK. Así se pueden recrear en cualquier Postgres con PostGIS, y la migración a Better Auth propio queda simple. El tipo de `user_id` sigue al de `neon_auth.user.id`, que se verifica en la fase 1.

### 3.2 Tablas

```sql
-- neon_auth.user (administrada por Neon Auth; incluye role y banned del plugin Admin)
profiles        (user_id PK (ref. lógica a neon_auth.user.id), display_name, avatar_url, city, bio, created_at)
sports          (id, slug, name, default_capacity int, icon)
user_sports     (user_id, sport_id, level skill_level)  -- beginner | intermediate | advanced (autodeclarado)
venues          (id, name, address, city, location geography(Point,4326),
                 google_place_id text unique, phone, photo_url,
                 status enum('verified','pending','rejected'), created_by, created_at)
venue_sports    (venue_id, sport_id)
teams           (id, name, sport_id, owner_id, invite_code unique, created_at, archived_at)
team_members    (team_id, user_id, role enum('owner','admin','member'), joined_at)
matches         (id, sport_id, venue_id, organizer_id, team_id NULL, title, description,
                 capacity int, level skill_level NULL, gender enum('mixed','male','female'),
                 price_per_person numeric, currency,
                 visibility enum('public','private'), invite_code unique,
                 status enum('draft','open','confirmed','played','cancelled'),
                 auto_confirm bool, voting_deadline timestamptz,
                 confirmed_slot_id NULL, contact_link text, created_at)
match_slots     (id, match_id, starts_at timestamptz, ends_at timestamptz)
slot_votes      (slot_id, user_id, created_at, PK(slot_id,user_id))
match_participants (match_id, user_id, status enum('interested','confirmed','waitlist','left'),
                 joined_at, confirmed_at, PK(match_id,user_id))
notifications   (id, user_id, type, payload jsonb, read_at, emailed_at, created_at)  -- in-app + outbox de emails
```

- **Referencias a usuarios:** `profiles.user_id` es la única referencia lógica a `neon_auth.user(id)` (sin FK, ver 3.1). Todos los demás `user_id` / `*_id` de personas tienen FK a `profiles(user_id)`. Las cuentas eliminadas se anonimizan, no se borran.
- **Integridad por FKs compuestas:** la opción confirmada pertenece al mismo partido (`matches(confirmed_slot_id, id) → match_slots(id, match_id)`) y solo votan participantes (`slot_votes(match_id, user_id) → match_participants`).
- **Implementación real:** ver `db/evolution/0001…0007`; este bloque es un resumen.
- **PostGIS en Drizzle:** `drizzle-kit pull` trae `location` como `geography(Point,4326)`. Las consultas de distancia (`ST_DWithin`) se escriben con el helper `sql`.
- **En los scripts de evolución:** `CREATE EXTENSION postgis, pg_trgm`, un índice GIST sobre `venues.location` y un índice GIN trigram sobre `venues.name`.
- **Índices comunes:** `matches(status, sport_id)`, `match_slots(starts_at)`, `match_participants(user_id, status)`.
- **Privacidad:** no se guarda la ubicación exacta de los usuarios (alcanza con la ciudad). `contact_link` y los datos de contacto solo los ven los confirmados.

---

## 4. Lógica de negocio (capa de servicios)

Cada servicio recibe `actor` (el usuario, o `null` si es anónimo), valida con zod, chequea permisos y corre en una transacción de Drizzle cuando modifica datos.

| Servicio | Qué hace |
|---|---|
| `createMatch(actor, input)` | Crea el partido, sus opciones y el organizador como participante, en una sola transacción. |
| `joinMatch(actor, matchId, slotIds)` | Bloquea el partido con `tx.select().from(matches).where(…).for('update')`. Si está `open`, suma al usuario como `interested` con sus votos. Si está `confirmed`, lo suma como `confirmed` si hay lugar y, si no, en `waitlist`. |
| `setVotes(actor, matchId, slotIds)` | Reemplaza los votos del usuario. Después revisa el quórum: avisa al organizador y confirma sola si corresponde. |
| `confirmSlot(actor, matchId, slotId)` | Solo el organizador. Asigna `confirmed` y `waitlist` por orden de voto y crea las notificaciones. |
| `leaveMatch(actor, matchId)` | Da de baja al usuario y, si era confirmado, promueve al primero de la lista de espera. |
| `cancelMatch(actor, matchId)` | Solo el organizador. Avisa a todos. |
| `saveTeamFromMatch(actor, matchId, name)` | Crea el `team` y sus `team_members` con los confirmados. |
| `searchMatches(actor, {lat, lng, radiusKm, sportId?, from?, to?, level?})` | Usa `ST_DWithin` y devuelve partidos `open` o `confirmed` con lugar libre, la próxima opción y cuántos faltan. |
| `findSimilarVenues(lat, lng, name)` | Busca sedes a menos de 150 m con nombre parecido (`similarity`), para no crear duplicados. |

**Autorización centralizada** en `src/server/authz.ts`:
- `requireUser()`, `assertOrganizer(match, actor)` y `assertAdmin(actor)` (este último lee `role` del usuario).
- `canViewMatch(match, actor)`: un partido público lo ve cualquiera, incluso sin login. Uno privado lo ven los participantes, los miembros del equipo y quien entra con el `invite_code`.
- `visibleVenuesFilter(actor)`: se ven las sedes `verified` y las que creó el propio usuario.
- La lectura de participantes recorta los datos cuando no hay login (solo nombre de pila y avatar).
- Regla del proyecto: **ningún componente ni ninguna acción consulta la base directamente**. Todo pasa por los servicios.

**Notificaciones:**
- Las filas de `notifications` se insertan dentro de la misma transacción que la acción que las origina.
- El email se manda enseguida con `after()` de Next, que corre después de responder al usuario.
- Si el envío falla, `emailed_at` queda en null y un cron lo reintenta.

**Tareas programadas** (Vercel Cron, definidas en `vercel.json` y protegidas con `CRON_SECRET`):

| Endpoint | Frecuencia | Qué hace |
|---|---|---|
| `/api/cron/matches` | Cada 15 min | Cierra votaciones vencidas (avisa al organizador) y marca como `played` los partidos cuya fecha ya pasó. |
| `/api/cron/reminders` | Cada hora | Recordatorios 24 h y 2 h antes del partido. |
| `/api/cron/emails` | Cada 15 min | Reintenta los emails pendientes. |

> ⚠️ En el plan **Hobby** de Vercel, el cron solo corre una vez por día. Para el lanzamiento hace falta **Vercel Pro**, o usar **Upstash QStash** (tiene un nivel gratis) llamando a los mismos endpoints.

**Preparado para mobile:** más adelante se exponen route handlers `/api/v1/*` que llaman a los mismos servicios.

---

## 5. Pantallas y rutas (App Router)

| Ruta | Contenido |
|---|---|
| `/` | Landing con buscador rápido (deporte y zona) y próximos partidos cercanos. |
| `/login` | Iniciar sesión con Google o con email y contraseña. Acepta `?next=`. |
| `/registro` | Crear una cuenta con Google o con email y contraseña. Después pide el código de verificación. |
| `/verificar-email` | Ingresar el código de verificación y reenviarlo si hace falta. |
| `/recuperar`, `/nueva-contrasena` | Recuperar la contraseña: pedir el link o código y definir la contraseña nueva. |
| `/onboarding` | Nombre, ciudad, deportes y nivel. Se muestra una sola vez, al completar el perfil. |
| `/explorar` | Lista y mapa de partidos con lugar libre. Filtros por deporte, distancia, fecha y nivel. |
| `/partidos/nuevo` | Asistente en pasos: deporte → sede (buscar en el catálogo o en Places, con aviso de duplicados) → opciones de horario (calendario con varias opciones) → cupo, nivel y precio → publicar. |
| `/partidos/[id]` | Detalle con mapa de la sede, **grilla Doodle** (participantes × opciones, con conteo y barra de cupo), botón "Me sumo", confirmados y lista de espera, y botón para compartir por WhatsApp. |
| `/partidos/[id]/gestionar` | Para el organizador: confirmar una opción, quitar a un participante, editar, cancelar o "Guardar equipo". |
| `/mis-partidos` | Próximos, en votación e historial. |
| `/equipos`, `/equipos/[id]` | Equipos persistentes: miembros, historial y "Nuevo partido con este equipo". |
| `/sedes/[id]`, `/sedes/nueva` | Detalle de una sede y alta desde Places. |
| `/i/[code]` | Invitación a un partido o equipo privado. |
| `/perfil`, `/perfil/[id]` | Perfil propio y perfil público. |
| `/admin/sedes`, `/admin/usuarios` | Moderación: aprobar, rechazar o fusionar sedes, y banear usuarios. |
| `/api/auth/[...path]` | Route handler del SDK de Neon Auth. |
| `/api/webhooks/neon-auth` | Webhook `send.otp` (emails de auth en español) y, si hace falta, `user.before_create`. |
| `/api/cron/*` | Tareas programadas, protegidas con un secreto. |

**Notificaciones del MVP** (in-app con un contador que se actualiza por polling, más email):
- Alguien se sumó a tu partido.
- Una opción llegó al cupo.
- El partido se confirmó (con un archivo `.ics` para agendar).
- Pasaste de la lista de espera a confirmado.
- El partido se canceló.
- Recordatorios.

Las notificaciones push quedan para la fase 2.

---

## 6. Estructura del proyecto

```
PickUp/
  mobile/                (reservada para la app futura)
  pickup-web/                   ← raíz de la app Next.js
  _handoff/              handoff de diseño (referencia, no se despliega)
  db/
    evolution/           0001_extensions.sql, 0002_enums.sql, … (fuente de verdad del esquema)
    seed/                deportes, sedes piloto (idempotentes)
  scripts/
    db-evolve.ts         runner: evolve / seed / rebuild (tabla schema_evolution)
    create-test-users.ts usuarios de prueba verificados (plugin Admin) en ramas de test
  drizzle.config.ts      solo para `db:pull` (schemaFilter: ['public'])
  vercel.json            definición de los crons (Root Directory del proyecto Vercel = web)
  src/
    app/                 rutas de la sección 5 (incluye api/auth, api/webhooks, api/cron)
    components/          ui/ (shadcn), match/ (SlotPollGrid, CapacityBar, JoinButton),
                         venue/ (VenuePicker, VenueMap), layout/
    server/              todo con import 'server-only'
      db/                client.ts (Pool de Neon + drizzle), schema/ (neon-auth (solo lectura),
                         profiles, venues, matches, teams, notifications), seed.ts
      auth.ts            createNeonAuth + requireUser + ensureProfile
      authz.ts           assertOrganizer, canViewMatch, …
      services/          matches.ts, venues.ts, teams.ts, search.ts, notifications.ts
      email/             plantillas React Email (auth y partidos) + envío con Resend
    lib/
      auth-client.ts     cliente de Neon Auth para componentes de cliente
      validations/       esquemas zod (match, venue, profile)
      dates.ts           helpers de zona horaria
    middleware.ts
  tests/                 integración (Vitest contra una rama de Neon)
  e2e/                   Playwright
  docs/                  plan técnico
```

**Entornos:**
- **Local:** se trabaja contra la rama `develop` de Neon, con auth incluido. No hace falta Docker; opcionalmente se puede usar un Postgres con PostGIS en Docker para probar `db:rebuild`.
- **Previews:** la integración Neon ↔ Vercel crea una rama por deploy de preview.
- **CI:** una rama efímera por corrida (`neonctl branches create` / `delete`).
- **Producción:** la rama `production`.

---

## 7. Plan de implementación por fases

1. **Setup.**
   - Crear la app Next en `pickup-web/` (TS, Tailwind v4, App Router, `src/`). Como `create-next-app` exige una carpeta vacía, se genera aparte y se mueve, conservando `_handoff/`.
   - shadcn/ui re-tematizado con los tokens Organic (`globals.css` + `@theme`), fuentes Caprasimo y Figtree, y Lucide.
   - Layout base con la barra de navegación del handoff.
   - Repo git en la raíz `PickUp/`, con un `.gitignore` que excluye `.env*`. ESLint y Prettier.
   - Conexión a Neon con `.env.local`.
   - Runner `db-evolve.ts` y el script `0001_extensions.sql` aplicado en la rama `develop`.
   - Verificar el tipo de `neon_auth.user.id`.
   - La integración Neon ↔ Vercel queda para cuando se cree el proyecto en Vercel.
2. **Usuarios y auth.**
   - Neon Auth: email y contraseña con verificación por código, Google, vinculación de cuentas, plugin Admin y trusted domains.
   - Pantallas de login, registro, verificación y recuperación.
   - `requireUser` con redirección `next`, `ensureProfile`, onboarding, perfil con avatar (Vercel Blob) y eliminar cuenta.
   - Webhook `send.otp` con plantillas en español y SMTP de Resend en staging.
   - Validar los dos puntos marcados con ⚠️ en la sección 2.1.
3. **Esquema base.** Scripts de evolución 0002 en adelante (enums, tablas, índices), aplicados en `dev`. Seed de deportes y de sedes de la ciudad piloto. `db:pull` para generar el esquema Drizzle. Verificar `db:rebuild` sobre una base vacía.
4. **Sedes.** `VenuePicker` (primero el catálogo, después Places Autocomplete), `findSimilarVenues`, alta como `pending` y `/admin/sedes`.
5. **Crear partido y votación.** Asistente de creación, `createMatch`, página de detalle con `SlotPollGrid`, `joinMatch`, `setVotes` y polling.
6. **Confirmación y cupo.** `confirmSlot`, `auto_confirm`, lista de espera, `leaveMatch` con promoción y `cancelMatch`.
7. **Explorar.** `searchMatches` con PostGIS, lista y mapa, filtros e invitaciones privadas (`/i/[code]`).
8. **Equipos persistentes.** `saveTeamFromMatch`, `/equipos` y "Nuevo partido con este equipo".
9. **Notificaciones.** Tabla y contador, emails con `after()`, crons (Vercel Pro o QStash), `.ics` y recordatorios.
10. **Pulido y lanzamiento.** Imágenes OG, manifest PWA, estados vacíos, rate limit en la creación de partidos, dominio, OAuth de Google propio y producción.

**Fuera del MVP (fase 2 en adelante):**
- App mobile con Expo, sobre `/api/v1` (con Neon Auth si ya lo soporta, o migrando a Better Auth propio).
- Tiempo real con Pusher o Ably, si el polling no alcanza.
- Notificaciones push.
- Chat nativo por partido (en el MVP se usa `contact_link` a WhatsApp).
- Pagos y división de costos (Mercado Pago).
- Reserva de canchas integrada con las sedes.
- Reputación y penalización por faltar sin avisar.
- Armado automático de equipos balanceados dentro del partido.
- Login por teléfono (el plugin Phone Number de Neon Auth ya existe).

---

## 8. Riesgos técnicos y cómo se cubren

| Riesgo | Cómo se cubre |
|---|---|
| Sobreinscripción por concurrencia | Transacción con `FOR UPDATE` en los servicios. No hay escrituras fuera de la capa de servicios. |
| Errores de autorización (sin RLS) | Toda lectura y escritura pasa por servicios que reciben `actor` y por helpers de `authz.ts`. Hay tests de integración por rol (anónimo, participante, organizador, admin). |
| Límites de Neon Auth (sin hooks ni plugins propios, emails, mobile) | El perfil se crea con `ensureProfile()`, sin hooks. Los emails en español salen por el webhook `send.otp`. Si mobile no está soportado, se migra a Better Auth propio (misma librería, datos en tu base). |
| Webhook de auth caído o lento | Handler mínimo (validar firma, renderizar el mail, llamar a Resend) con timeout corto. Monitorear sus errores, porque si falla bloquea el login por código. |
| Conexiones desde serverless | Endpoint pooled de Neon y un solo `Pool` por instancia, reutilizado entre requests. |
| Arranque en frío de Neon (se suspende sin uso y el primer query tarda cientos de ms) | Es aceptable en un MVP. En los planes pagos se puede desactivar la suspensión en producción. |
| Crons limitados en Vercel Hobby | Vercel Pro o Upstash QStash. Los envíos inmediatos no dependen del cron (`after()`). |
| Zonas horarias | `timestamptz`, zona horaria de la sede y fechas mostradas con `date-fns-tz`. |
| Sedes duplicadas | `google_place_id` único, proximidad más trigram antes de crear y fusión desde el admin. |
| Costos de Google Maps | Session tokens en Autocomplete; los datos de la sede se guardan en `venues` para no repetir llamadas a Places Details. |
| Secretos expuestos | `server-only` en todo `src/server/`. Solo las variables `NEXT_PUBLIC_*` llegan al navegador (la API key de Maps restringida por dominio). |
| Arranque en frío (pocos usuarios al principio) | Riesgo de producto, no técnico: lanzar en una ciudad piloto con sedes precargadas y compartir mucho por WhatsApp. |

---

## 9. Verificación

- **Base de datos:**
  - `npm run db:rebuild -- --confirm` sobre una base vacía (una rama nueva de Neon o un Postgres con PostGIS en Docker) tiene que dejar el mismo esquema que `dev`. Se comparan los esquemas con `drizzle-kit pull` de ambas.
  - `db:evolve` vuelto a correr no hace nada.
  - Un checksum alterado frena la ejecución.
  - `neon_auth` no se toca.
- **Integración (Vitest, contra una rama efímera de Neon)**, con usuarios de prueba creados por script:
  - Reglas de autorización por rol: un anónimo ve partidos públicos pero no privados ni el `contact_link`; solo el organizador puede confirmar o cancelar.
  - `confirmSlot` asigna confirmados y lista de espera por orden de voto.
  - `leaveMatch` promueve al primero de la lista de espera.
  - `searchMatches` filtra bien por distancia.
- **Concurrencia:** 20 llamadas simultáneas a `joinMatch` sobre un partido confirmado con 9 de 10 lugares ocupados. Tiene que quedar exactamente 1 confirmado nuevo y 19 en lista de espera.
- **E2E con Playwright** sobre una preview de Vercel y su rama de Neon, con usuarios de prueba ya verificados:
  - **Auth:** login con email y logout. Sin login, `/partidos/[id]` se ve, y "Me sumo" lleva a `/login?next=…` y vuelve al partido ya logueado. `/mis-partidos` sin sesión redirige a `/login`.
  - **Partido:**
    1. A crea un Fútbol 5 con 3 opciones.
    2. B a J se suman y votan; la opción 2 llega a 10.
    3. A confirma y K entra a la lista de espera.
    4. B se baja y K pasa a confirmado.
    5. Se verifican las notificaciones in-app.
- **Manual en staging:**
  - Registro con email: llega el código en español vía webhook y Resend, y se termina en `/onboarding`.
  - "Olvidé mi contraseña" de punta a punta.
  - Login con Google y vinculación con una cuenta de email existente.
  - Alta de sede con Places.
  - El link compartido por WhatsApp muestra la tarjeta OG.
  - La grilla con dos navegadores se actualiza por polling.
  - Eliminar la cuenta.
- **Unitarios (Vitest):** esquemas zod, helpers de fechas y el handler del webhook (validación de firma).

---

## Próximo paso al aprobar

1. Copiar este plan a `pickup-web/docs/plan-tecnico.md`. El README del handoff lo referencia con ese nombre.
2. **Fase 1:** scaffolding de Next en `pickup-web/` con el tema Organic, el runner de evolución y la conexión a Neon (rama `develop`).
3. **Fase 3 antes que la 2:** construir el esquema en Neon con los scripts de evolución y el seed. La base es lo que querés tener primero.
4. **Fase 2:** Neon Auth y las pantallas de login, registro y onboarding del handoff.

**Datos de conexión que se necesitan:** en `pickup-web/.env.local`, que no se commitea:
- `DATABASE_URL`: el connection string **pooled** de la rama `develop`.
- `DATABASE_URL_UNPOOLED`: el connection string **directo** de la misma rama.
- Las variables de Neon Auth se agregan en la fase 2.
