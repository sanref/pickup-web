import { autoConfirmBodySchema } from "@/lib/validations/api";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson, uuidParam } from "@/server/api/http";
import { revalidateMatchViews } from "@/server/revalidate";
import { setAutoConfirm } from "@/server/services/matches";

// Organizador: confirmar solo el primer horario que llegue al cupo.
export const PUT = handle(async (request, ctx: RouteContext<"/api/v1/matches/[id]/auto-confirm">) => {
  const id = uuidParam((await ctx.params).id, "El partido");
  const actor = await requireApiActor(request);
  const { value } = await readJson(request, autoConfirmBodySchema);
  await setAutoConfirm(actor, id, value);
  revalidateMatchViews(id);
  return ok(null);
});
