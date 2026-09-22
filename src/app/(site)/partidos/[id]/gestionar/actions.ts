"use server";

import { z } from "zod";
import { requireOnboardedActor } from "@/server/auth/session";
import { runMatchAction, type MatchActionResult } from "@/server/match-action";
import { cancelMatch, confirmSlot, removeParticipant, setAutoConfirm } from "@/server/services/matches";

const uuid = z.string().uuid();

async function organizer(matchId: string) {
  return requireOnboardedActor(`/partidos/${matchId}/gestionar`);
}

export async function confirmSlotAction(input: unknown): Promise<MatchActionResult> {
  const { matchId, slotId } = z.object({ matchId: uuid, slotId: uuid }).parse(input);
  const actor = await organizer(matchId);
  return runMatchAction(matchId, async () => {
    await confirmSlot(actor, matchId, slotId);
    return null;
  });
}

export async function setAutoConfirmAction(input: unknown): Promise<MatchActionResult> {
  const { matchId, value } = z.object({ matchId: uuid, value: z.boolean() }).parse(input);
  const actor = await organizer(matchId);
  return runMatchAction(matchId, async () => {
    await setAutoConfirm(actor, matchId, value);
    return null;
  });
}

export async function removeParticipantAction(input: unknown): Promise<MatchActionResult> {
  const { matchId, userId } = z.object({ matchId: uuid, userId: uuid }).parse(input);
  const actor = await organizer(matchId);
  return runMatchAction(matchId, async () => {
    await removeParticipant(actor, matchId, userId);
    return null;
  });
}

export async function cancelMatchAction(input: unknown): Promise<MatchActionResult> {
  const { matchId } = z.object({ matchId: uuid }).parse(input);
  const actor = await organizer(matchId);
  return runMatchAction(matchId, async () => {
    await cancelMatch(actor, matchId);
    return null;
  });
}
