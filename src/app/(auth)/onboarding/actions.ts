"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { onboardingSchema } from "@/lib/validations/profile";
import { requireActor } from "@/server/auth/session";
import { completeOnboarding } from "@/server/services/profiles";

export async function completeOnboardingAction(input: unknown, next: string): Promise<{ error: string }> {
  const actor = await requireActor("/onboarding");
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  try {
    await completeOnboarding(actor.user.id, parsed.data);
  } catch {
    return { error: "No pudimos guardar tu perfil. Probá de nuevo." };
  }
  redirect(safeNext(next));
}
