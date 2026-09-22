import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext, withNext } from "@/lib/safe-next";
import { getActor } from "@/server/auth/session";

// Destino de la vuelta de Google. El proxy ya canjeó el verificador por la cookie de sesión.
// El primer ingreso pasa por el onboarding antes de seguir a `next`.
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const actor = await getActor();
  if (actor && !actor.profile.onboardedAt) redirect(withNext("/onboarding", next));
  redirect(next);
}
