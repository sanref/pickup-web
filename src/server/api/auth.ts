import "server-only";
import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import type { Actor, SessionUser } from "@/server/auth/session";
import { bearerToken, neonTokenVerifier } from "@/server/auth/bearer";
import { db } from "@/server/db/client";
import { ensureProfile } from "@/server/services/profiles";
import { ApiError, unauthorized } from "./http";

// La API v1 se autentica SOLO con `Authorization: Bearer <jwt de Neon Auth>`, nunca con la cookie
// de la web: así no hay superficie de CSRF y la web sigue usando sus Server Actions.

type AuthUserRow = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banExpires: Date | string | null;
};

// El usuario sale de neon_auth.user (lo administra Neon, vive en nuestra base): así el rol y el
// baneo son los de ahora y no los del momento en que se emitió el token.
async function loadUser(id: string): Promise<SessionUser | null> {
  const { rows } = await db.execute<AuthUserRow>(sql`
    select id, name, email, "emailVerified", image, role, banned, "banExpires"
      from neon_auth."user" where id = ${id}`);
  const row = rows[0];
  if (!row) return null;
  const banExpires = row.banExpires == null ? null : new Date(row.banExpires);
  if (row.banned && (!banExpires || banExpires.getTime() > Date.now())) {
    throw new ApiError(403, "banned", "Tu cuenta está suspendida.");
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? "",
    image: row.image,
    emailVerified: row.emailVerified,
    role: row.role,
  };
}

// Actor del request, o null si no mandó token. Un token inválido o vencido es 401 (no anónimo),
// para que la app sepa que tiene que renovarlo.
export async function getApiActor(request: NextRequest): Promise<Actor | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const token = bearerToken(header);
  const userId = token ? await neonTokenVerifier()(token) : null;
  if (!userId) throw new ApiError(401, "invalid_token", "Tu sesión venció. Volvé a iniciar sesión.");
  const user = await loadUser(userId);
  if (!user) throw new ApiError(401, "invalid_token", "Tu sesión venció. Volvé a iniciar sesión.");
  return { user, profile: await ensureProfile(user) };
}

// Exige sesión y, salvo `onboarded: false`, el onboarding completo (ciudad y deportes).
export async function requireApiActor(request: NextRequest, { onboarded = true } = {}): Promise<Actor> {
  const actor = await getApiActor(request);
  if (!actor) throw unauthorized();
  if (onboarded && !actor.profile.onboardedAt) {
    throw new ApiError(403, "onboarding_required", "Completá tu perfil para seguir.");
  }
  return actor;
}
