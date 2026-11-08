import { requireApiActor } from "@/server/api/auth";
import { handle, ok, uuidParam } from "@/server/api/http";
import { revalidateMatchViews } from "@/server/revalidate";
import { cancelMatch } from "@/server/services/matches";

// Organizador: cancelar el partido (se les avisa a los anotados).
export const POST = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/cancel">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  await cancelMatch(await requireApiActor(request), id);
  revalidateMatchViews(id);
  return ok(null);
});
