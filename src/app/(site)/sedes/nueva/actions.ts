"use server";

import { redirect } from "next/navigation";
import { createVenueSchema, similarVenuesSchema } from "@/lib/validations/venue";
import { requireOnboardedActor } from "@/server/auth/session";
import { createVenue, findSimilarVenues, type VenueSummary } from "@/server/services/venues";

export async function findSimilarVenuesAction(input: unknown): Promise<VenueSummary[]> {
  await requireOnboardedActor("/sedes/nueva");
  const parsed = similarVenuesSchema.safeParse(input);
  if (!parsed.success) return [];
  return findSimilarVenues(parsed.data);
}

export async function createVenueAction(input: unknown): Promise<{ error: string }> {
  const actor = await requireOnboardedActor("/sedes/nueva");
  const parsed = createVenueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  let result;
  try {
    result = await createVenue(actor, parsed.data);
  } catch {
    return { error: "No pudimos guardar la sede. Probá de nuevo." };
  }
  redirect(`/sedes/${result.id}${result.existing ? "?existente=1" : ""}`);
}
