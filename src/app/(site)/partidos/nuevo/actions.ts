"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createMatchSchema } from "@/lib/validations/match";
import { requireOnboardedActor } from "@/server/auth/session";
import { UserError } from "@/server/errors";
import { createMatch } from "@/server/services/matches";
import { searchVenues, type VenueSummary } from "@/server/services/venues";

export async function searchVenuesForMatchAction(input: unknown): Promise<VenueSummary[]> {
  const actor = await requireOnboardedActor("/partidos/nuevo");
  const parsed = z.object({ q: z.string().max(80), sportId: z.number().int().positive().optional() }).safeParse(input);
  if (!parsed.success) return [];
  return searchVenues(actor, { q: parsed.data.q, sportId: parsed.data.sportId, limit: 12 });
}

export async function createMatchAction(input: unknown): Promise<{ error: string }> {
  const actor = await requireOnboardedActor("/partidos/nuevo");
  const parsed = createMatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  let id: string;
  try {
    ({ id } = await createMatch(actor, parsed.data));
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[partidos] createMatch", error);
    return { error: "No pudimos crear el partido. Probá de nuevo." };
  }
  redirect(`/partidos/${id}?nuevo=1`);
}
