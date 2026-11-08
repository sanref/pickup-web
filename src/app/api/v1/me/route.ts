import { revalidatePath } from "next/cache";
import { profileSchema } from "@/lib/validations/profile";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson } from "@/server/api/http";
import { meResponse } from "@/server/api/me";
import { ensureProfile, updateProfile } from "@/server/services/profiles";

// Usuario y perfil. No exige onboarding: la app lo usa para decidir si mostrarlo.
export const GET = handle(async (request) => {
  return ok(await meResponse(await requireApiActor(request, { onboarded: false })));
});

// Editar el perfil (mismo cuerpo que /perfil en la web). Devuelve el perfil actualizado.
export const PATCH = handle(async (request) => {
  const actor = await requireApiActor(request);
  const input = await readJson(request, profileSchema);
  await updateProfile(actor.user.id, input);
  revalidatePath("/", "layout");
  return ok(await meResponse({ user: actor.user, profile: await ensureProfile(actor.user) }));
});
