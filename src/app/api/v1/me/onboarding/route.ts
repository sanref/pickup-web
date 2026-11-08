import { onboardingSchema } from "@/lib/validations/profile";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson } from "@/server/api/http";
import { meResponse } from "@/server/api/me";
import { completeOnboarding, ensureProfile } from "@/server/services/profiles";

// Completar el perfil (nombre, ciudad, deportes y nivel). Se puede repetir: es idempotente.
export const POST = handle(async (request) => {
  const actor = await requireApiActor(request, { onboarded: false });
  const input = await readJson(request, onboardingSchema);
  await completeOnboarding(actor.user.id, input);
  return ok(await meResponse({ user: actor.user, profile: await ensureProfile(actor.user) }));
});
