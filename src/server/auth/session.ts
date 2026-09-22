import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { withNext } from "@/lib/safe-next";
import { ensureProfile, type Profile } from "@/server/services/profiles";
import { auth } from "./neon";

export { auth };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  role: string | null;
};

export type Actor = { user: SessionUser; profile: Profile };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // El SDK atrapa la señal de render dinámico de Next; leer las cookies antes la deja propagar.
  await cookies();
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    emailVerified: user.emailVerified,
    role: (user as { role?: string | null }).role ?? null,
  };
});

// Usuario + perfil (creado en el primer ingreso). Null si no hay sesión.
export const getActor = cache(async (): Promise<Actor | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  return { user, profile: await ensureProfile(user) };
});

// Para páginas y acciones que exigen sesión. `next` es la ruta a la que se vuelve después del login.
export async function requireActor(next: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(withNext("/login", next));
  return actor;
}

// Además exige el onboarding completo (ciudad y deportes).
export async function requireOnboardedActor(next: string): Promise<Actor> {
  const actor = await requireActor(next);
  if (!actor.profile.onboardedAt) redirect(withNext("/onboarding", next));
  return actor;
}
