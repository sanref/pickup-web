import { requireApiActor } from "@/server/api/auth";
import { handle, notFound, ok, uuidParam } from "@/server/api/http";
import { isAdmin } from "@/server/authz";
import { getMatchDetail, getSlotVoters } from "@/server/services/matches";

// Datos de "Gestionar" (organizador o admin): votantes de cada horario por orden de voto, para ver
// quién quedaría confirmado y quién en espera. El resto sale de GET /matches/:id.
export const GET = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/manage">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  const actor = await requireApiActor(request);
  const match = await getMatchDetail(actor, id);
  // Igual que en la web: para quien no organiza, la gestión no existe.
  if (!match || !(match.viewer.isOrganizer || isAdmin(actor))) throw notFound("El partido");
  return ok({ slots: await getSlotVoters(id) });
});
