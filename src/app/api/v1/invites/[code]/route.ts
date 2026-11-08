import { handle, notFound, ok } from "@/server/api/http";
import { findMatchIdByInvite } from "@/server/services/matches";

// Link de invitación (/i/<código>) → id del partido. La app después pide
// GET /matches/:id?invite=<código>, que es lo que da acceso a un partido privado.
export const GET = handle(async (_request, ctx: RouteContext<"/api/v1/invites/[code]">) => {
  const { code } = await ctx.params;
  if (!/^[a-z0-9]{6,40}$/.test(code)) throw notFound("La invitación");
  const matchId = await findMatchIdByInvite(code);
  if (!matchId) throw notFound("La invitación");
  return ok({ matchId });
});
