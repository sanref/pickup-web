import type { ApiJoinResult } from "@/lib/api/contract";
import { joinBodySchema } from "@/lib/validations/api";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson, uuidParam } from "@/server/api/http";
import { revalidateMatchViews } from "@/server/revalidate";
import { joinMatch } from "@/server/services/matches";

// "Me sumo": en votación queda interesado; confirmado, entra si hay lugar o va a la lista de espera.
export const POST = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/join">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  const actor = await requireApiActor(request);
  const { invite } = await readJson(request, joinBodySchema);
  const status = await joinMatch(actor, id, invite);
  revalidateMatchViews(id);
  return ok({ status } satisfies ApiJoinResult);
});
