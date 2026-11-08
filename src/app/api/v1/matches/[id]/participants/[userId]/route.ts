import { requireApiActor } from "@/server/api/auth";
import { handle, ok, uuidParam } from "@/server/api/http";
import { revalidateMatchViews } from "@/server/revalidate";
import { removeParticipant } from "@/server/services/matches";

// Organizador: sacar a un participante (se le avisa).
export const DELETE = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/participants/[userId]">) => {
  const params = await ctx.params;
  const id = uuidParam(params.id, "El partido");
  const userId = uuidParam(params.userId, "El participante");
  await removeParticipant(await requireApiActor(request), id, userId);
  revalidateMatchViews(id);
  return ok(null);
});
