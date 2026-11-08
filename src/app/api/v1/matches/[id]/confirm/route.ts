import { confirmSlotBodySchema } from "@/lib/validations/api";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson, uuidParam } from "@/server/api/http";
import { revalidateMatchViews } from "@/server/revalidate";
import { confirmSlot } from "@/server/services/matches";

// Organizador: confirmar uno de los horarios (cierra la votación y arma confirmados y espera).
export const POST = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/confirm">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  const actor = await requireApiActor(request);
  const { slotId } = await readJson(request, confirmSlotBodySchema);
  await confirmSlot(actor, id, slotId);
  revalidateMatchViews(id);
  return ok(null);
});
