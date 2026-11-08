import { requireApiActor } from "@/server/api/auth";
import { handle, ok, uuidParam } from "@/server/api/http";
import { revalidateMatchViews } from "@/server/revalidate";
import { leaveMatch } from "@/server/services/matches";

// Bajarse del partido (si era confirmado, sube el primero de la lista de espera).
export const POST = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/leave">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  await leaveMatch(await requireApiActor(request), id);
  revalidateMatchViews(id);
  return ok(null);
});
