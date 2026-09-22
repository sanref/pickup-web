"use server";

import { z } from "zod";
import { setVotesSchema } from "@/lib/validations/match";
import { requireOnboardedActor } from "@/server/auth/session";
import { runMatchAction, type MatchActionResult } from "@/server/match-action";
import { joinMatch, leaveMatch, setVotes, type ParticipantStatus } from "@/server/services/matches";

const target = z.object({ matchId: z.string().uuid(), invite: z.string().max(40).optional() });

export async function setVotesAction(input: unknown): Promise<MatchActionResult> {
  const parsed = setVotesSchema.parse(input);
  const actor = await requireOnboardedActor(`/partidos/${parsed.matchId}`);
  return runMatchAction(parsed.matchId, async () => {
    await setVotes(actor, parsed.matchId, parsed.slotIds, parsed.invite);
    return null;
  });
}

export async function joinMatchAction(input: unknown): Promise<MatchActionResult<ParticipantStatus>> {
  const parsed = target.parse(input);
  const actor = await requireOnboardedActor(`/partidos/${parsed.matchId}`);
  return runMatchAction(parsed.matchId, () => joinMatch(actor, parsed.matchId, parsed.invite));
}

export async function leaveMatchAction(input: unknown): Promise<MatchActionResult> {
  const parsed = target.parse(input);
  const actor = await requireOnboardedActor(`/partidos/${parsed.matchId}`);
  return runMatchAction(parsed.matchId, async () => {
    await leaveMatch(actor, parsed.matchId);
    return null;
  });
}
