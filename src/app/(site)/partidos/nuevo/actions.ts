"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createMatchSchema } from "@/lib/validations/match";
import { requireOnboardedActor } from "@/server/auth/session";
import { UserError } from "@/server/errors";
import { createMatch } from "@/server/services/matches";
import { getCourtBusy, listCourtsForMatch, type CourtOption } from "@/server/services/venue-admin";
import { searchVenues, type VenueSummary } from "@/server/services/venues";

export async function listCourtsForMatchAction(input: unknown): Promise<CourtOption[]> {
  await requireOnboardedActor("/partidos/nuevo");
  const parsed = z.object({ venueId: z.string().uuid(), sportId: z.number().int().positive() }).safeParse(input);
  if (!parsed.success) return [];
  return listCourtsForMatch(parsed.data.venueId, parsed.data.sportId);
}

// Solo franjas horarias: no expone a nombre de quién está cada turno.
export async function getCourtBusyAction(input: unknown): Promise<{ start: string; end: string }[]> {
  await requireOnboardedActor("/partidos/nuevo");
  const parsed = z.object({ courtId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(input);
  if (!parsed.success) return [];
  return getCourtBusy(parsed.data.courtId, parsed.data.date);
}

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
