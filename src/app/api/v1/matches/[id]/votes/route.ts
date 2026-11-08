import { votesBodySchema } from "@/lib/validations/api";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson, uuidParam } from "@/server/api/http";
import { revalidateMatchViews } from "@/server/revalidate";
import { setVotes } from "@/server/services/matches";

// Reemplaza los votos del usuario (los horarios que le sirven). Votar lo suma como interesado.
export const PUT = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/votes">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  const actor = await requireApiActor(request);
  const { slotIds, invite } = await readJson(request, votesBodySchema);
  await setVotes(actor, id, slotIds, invite);
  revalidateMatchViews(id);
  return ok(null);
});
