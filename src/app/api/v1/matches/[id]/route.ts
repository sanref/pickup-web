import { matchDetailQuerySchema } from "@/lib/validations/api";
import { getApiActor } from "@/server/api/auth";
import { handle, notFound, ok, readQuery, uuidParam } from "@/server/api/http";
import { getMatchDetail } from "@/server/services/matches";

// Detalle del partido (grilla de votos, participantes y estado del que mira). Público si el
// partido es público o si se manda ?invite=<código>; sin sesión los nombres van solo con el de pila.
export const GET = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  const { invite } = readQuery(request, matchDetailQuerySchema);
  const match = await getMatchDetail(await getApiActor(request), id, invite);
  if (!match) throw notFound("El partido");
  return ok(match);
});
