"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setVotesSchema } from "@/lib/validations/match";
import { requireOnboardedActor } from "@/server/auth/session";
import { UserError } from "@/server/errors";
import { joinMatch, leaveMatch, setVotes } from "@/server/services/matches";

export type MatchActionResult = { ok: true } | { ok: false; error: string };

async function run(matchId: string, fn: () => Promise<void>): Promise<MatchActionResult> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof UserError) return { ok: false, error: error.message };
    console.error("[partidos]", error);
    return { ok: false, error: "No pudimos guardar el cambio. Probá de nuevo." };
  }
  revalidatePath(`/partidos/${matchId}`);
  revalidatePath("/mis-partidos");
  return { ok: true };
}

const target = z.object({ matchId: z.string().uuid(), invite: z.string().max(40).optional() });

export async function setVotesAction(input: unknown): Promise<MatchActionResult> {
  const parsed = setVotesSchema.parse(input);
  const actor = await requireOnboardedActor(`/partidos/${parsed.matchId}`);
  return run(parsed.matchId, () => setVotes(actor, parsed.matchId, parsed.slotIds, parsed.invite));
}

export async function joinMatchAction(input: unknown): Promise<MatchActionResult> {
  const parsed = target.parse(input);
  const actor = await requireOnboardedActor(`/partidos/${parsed.matchId}`);
  return run(parsed.matchId, () => joinMatch(actor, parsed.matchId, parsed.invite));
}

export async function leaveMatchAction(input: unknown): Promise<MatchActionResult> {
  const parsed = target.parse(input);
  const actor = await requireOnboardedActor(`/partidos/${parsed.matchId}`);
  return run(parsed.matchId, () => leaveMatch(actor, parsed.matchId));
}
