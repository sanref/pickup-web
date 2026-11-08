import { placeDetailQuerySchema } from "@/lib/validations/api";
import { requireApiActor } from "@/server/api/auth";
import { handle, notFound, ok, readQuery } from "@/server/api/http";
import { getPlace } from "@/server/services/places";

// Datos del lugar elegido (cierra la sesión de autocompletado). Solo con sesión.
export const GET = handle(async (request, ctx: RouteContext<"/api/v1/places/[placeId]">) => {
  await requireApiActor(request);
  const { placeId } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) throw notFound("El lugar");
  const { session } = readQuery(request, placeDetailQuerySchema);
  return ok(await getPlace(placeId, session));
});
