# API v1 (para la app mobile)

Route handlers en `src/app/api/v1/*`. Usan **los mismos servicios** (`src/server/services`) que las Server Actions de la web, así que permisos, reglas de negocio y notificaciones son idénticos. La web no usa esta API: sigue con sus Server Actions.

- Contrato de tipos: [`src/lib/api/contract.ts`](../src/lib/api/contract.ts) (respuestas) y [`src/lib/validations/api.ts`](../src/lib/validations/api.ts) + `match.ts`, `profile.ts`, `venue.ts` (cuerpos y queries, con zod).
- Infra: [`src/server/api/http.ts`](../src/server/api/http.ts) (sobre de respuesta y errores) y [`src/server/api/auth.ts`](../src/server/api/auth.ts) (sesión).

## Autenticación

La API se autentica **solo** con `Authorization: Bearer <jwt>`. Nunca con la cookie de la web, así no hay superficie de CSRF.

1. La app inicia sesión **directo contra Neon Auth** (`NEON_AUTH_BASE_URL`): `POST /sign-in/email`, `POST /sign-up/email`, verificación por OTP, recuperar contraseña, etc. Son los endpoints estándar de Better Auth.
   - La app manda **siempre** `Origin` con un dominio de *Trusted domains*. Sin él, `sign-up` (y todo lo que lleve `callbackURL` relativo) responde `400 MISSING_ORIGIN`, y cualquier request con headers `sec-fetch-*` (como los del `fetch` de Node) responde `403 MISSING_OR_NULL_ORIGIN`.
2. La sesión es la cookie `__Secure-neon-auth.session_token` (dura 7 días) que llega en `Set-Cookie`. **Neon Auth no tiene el plugin bearer**: el `token` que viene en el body del login no sirve como `Authorization`. La app guarda el par `nombre=valor` de esa cookie en SecureStore y lo manda como header `Cookie` en los requests a Neon Auth. Es lo mismo que hace el cliente de Better Auth para Expo.
3. Con la cookie, la app pide el JWT: `GET {NEON_AUTH_BASE_URL}/token` → `{ token }`. El JWT dura **15 minutos**: hay que renovarlo antes de que venza o al recibir `401 invalid_token`.
4. Cada request a `/api/v1` lleva `Authorization: Bearer <jwt>`.
5. El servidor verifica la firma con el JWKS público de la rama (`{NEON_AUTH_BASE_URL}/.well-known/jwks.json`, EdDSA). Después carga el usuario desde `neon_auth.user`, así que el rol y el baneo son los vigentes y no los del momento del token. Por último crea el perfil si no existe (`ensureProfile`).

Sin header Authorization, los endpoints públicos responden como anónimo. Con un token inválido o vencido responden siempre `401 invalid_token`, nunca como anónimo.

Validado contra develop (nov 2026): login con email → cookie → `/token` → JWT EdDSA con `iss`/`aud` = origen de Neon Auth → aceptado por el verificador de la API.

**⚠️ Pendiente de validar:**
- **Google OAuth** en la app: el `callbackURL` tiene que ser un deep link (`pickup://…`) o una página puente de la web. Hay que ver si Neon Auth acepta el esquema en *Trusted domains*. Si no lo soporta, el plan B es el del plan técnico: Better Auth propio.
- Claims del JWT: solo se usa `sub` (id del usuario) y `exp`. El resto sale de la base.

## Formato

- Éxito: `{ "data": … }`. Error: `{ "error": { "code", "message", "issues"? } }`.
- `message` está en español y se le puede mostrar al usuario. `code` es estable y sirve para decidir qué hacer.
- Fechas en ISO 8601 UTC. Se muestran en la zona de la sede (`venue.timezone`).
- Todas las respuestas llevan `Cache-Control: no-store`.

| `code` | HTTP | Qué hacer en la app |
|---|---|---|
| `invalid_input` | 400 | Mostrar `message`; `issues` trae el campo. |
| `unauthorized` | 401 | Llevar al login. |
| `invalid_token` | 401 | Renovar el JWT y reintentar una vez; si vuelve, login. |
| `banned` | 403 | Cuenta suspendida. |
| `onboarding_required` | 403 | Llevar al onboarding (`POST /me/onboarding`). |
| `not_found` | 404 | No existe o no hay acceso (no se distingue a propósito). |
| `rejected` | 422 | Regla de negocio (votación cerrada, sin lugar, no sos el organizador…): mostrar `message`. |
| `internal` | 500 | Error genérico. |
| `unavailable` | 503 | Función no configurada en el servidor (hoy: Google Places). |

## Endpoints

🔓 público (la sesión es opcional) · 🔑 requiere sesión · ✅ requiere sesión y onboarding completo

| Método y ruta | Acceso | Cuerpo / query | Respuesta | Equivale en la web a |
|---|---|---|---|---|
| `GET /sports` | 🔓 | | `ApiSport[]` | catálogo de deportes |
| `GET /me` | 🔑 | | `ApiMe` | `/perfil` |
| `PATCH /me` | ✅ | `profileSchema` | `ApiMe` | `updateProfileAction` |
| `POST /me/onboarding` | 🔑 | `onboardingSchema` | `ApiMe` | `completeOnboardingAction` |
| `GET /me/matches` | ✅ | | `ApiMyMatch[]` | `/mis-partidos` |
| `GET /matches` | 🔓 | `lat, lng, km, sportId, level, when, sort, limit` | `ApiMatchSearch` | `/explorar` |
| `POST /matches` | ✅ | `createMatchSchema` | `201 { id }` | `createMatchAction` |
| `GET /matches/:id` | 🔓 | `?invite=` | `ApiMatchDetail` | `/partidos/[id]` |
| `PUT /matches/:id/votes` | ✅ | `{ slotIds, invite? }` | `null` | `setVotesAction` |
| `POST /matches/:id/join` | ✅ | `{ invite? }` | `{ status }` | `joinMatchAction` |
| `POST /matches/:id/leave` | ✅ | | `null` | `leaveMatchAction` |
| `GET /matches/:id/manage` | ✅ organizador/admin | | `{ slots: ApiManageSlot[] }` | `/partidos/[id]/gestionar` |
| `POST /matches/:id/confirm` | ✅ organizador | `{ slotId }` | `null` | `confirmSlotAction` |
| `PUT /matches/:id/auto-confirm` | ✅ organizador | `{ value }` | `null` | `setAutoConfirmAction` |
| `DELETE /matches/:id/participants/:userId` | ✅ organizador | | `null` | `removeParticipantAction` |
| `POST /matches/:id/cancel` | ✅ organizador | | `null` | `cancelMatchAction` |
| `GET /invites/:code` | 🔓 | | `{ matchId }` | `/i/[code]` |
| `GET /venues` | 🔓 | `q, sportId, lat, lng, limit` | `ApiVenue[]` | `/sedes`, buscador del asistente |
| `POST /venues` | ✅ | `createVenueSchema` | `201 ApiCreateVenueResult` (`200` si ya existía) | `createVenueAction` |
| `POST /venues/similar` | ✅ | `similarVenuesSchema` | `ApiVenue[]` | `findSimilarVenuesAction` |
| `GET /venues/:id` | 🔓 | | `ApiVenueDetail` (`308` si se fusionó) | `/sedes/[id]` |
| `GET /places/autocomplete` | 🔑 | `q, lat?, lng?, session` | `ApiPlaceSuggestion[]` | buscador de Google Maps de `/sedes/nueva` |
| `GET /places/:placeId` | 🔑 | `session` | `ApiPlace` | elegir el lugar en `/sedes/nueva` |

Los dos de `/places` consultan Google Places (New) desde el servidor con `GOOGLE_PLACES_API_KEY`, una clave de servidor que nunca llega a la app. Sin esa variable responden `503 unavailable`. `session` lo genera la app y lo reutiliza durante la búsqueda hasta pedir el detalle del lugar elegido: así Google cobra la búsqueda completa como una sola sesión.

Quedan fuera a propósito:
- La **moderación** (`/admin/*`) sigue solo en la web.
- **Cambiar la contraseña** se hace directo contra Neon Auth (`POST /change-password`).
- `GET /matches` sin `lat`/`lng` busca en la ciudad piloto. La web usa la cookie de ubicación; la app manda la del teléfono.

## Ejemplo

```bash
curl "$API/api/v1/matches?lat=-32.95&lng=-60.64&km=10&when=semana"
curl -X POST "$API/api/v1/matches/$ID/join" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{}'
```

## Pendiente para mobile (fuera de este paso)

- **Compartir tipos con `pickup-mobile`:** hoy el contrato importa tipos de los servicios con `import type`. La app los puede referenciar con un path alias a `../pickup-web/src/lib`. Si se vuelve incómodo, se pasa a un monorepo con npm workspaces y un paquete `@pickup/contract`, que mueva `src/lib/validations` y `src/lib/api`.
- **Notificaciones push** (Expo): tabla de tokens de dispositivo y envío desde `notify()`. Va junto con los emails de la fase de notificaciones.
- **Rate limiting** de `/api/v1`, antes de publicar la app.
