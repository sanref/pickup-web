import type { ApiVenueDetail } from "@/lib/api/contract";
import { getApiActor } from "@/server/api/auth";
import { handle, notFound, ok, uuidParam } from "@/server/api/http";
import { getVenue } from "@/server/services/venues";

// Detalle de una sede. Si se fusionó con otra, redirige (308) a la sede que quedó.
export const GET = handle(async (request, ctx: RouteContext<"/api/v1/venues/[id]">) => {
  const id = uuidParam((await ctx.params).id, "La sede");
  const actor = await getApiActor(request);
  const result = await getVenue(actor, id);
  if (!result) throw notFound("La sede");
  if ("redirectTo" in result) return Response.redirect(new URL(`/api/v1/venues/${result.redirectTo}`, request.url), 308);
  // Quién la propuso no se expone: solo si es del que mira (para mostrar "pendiente de revisión").
  const { id: venueId, name, address, city, status, location, sports, googlePlaceId, createdBy } = result.venue;
  return ok({
    id: venueId,
    name,
    address,
    city,
    status,
    location,
    sports,
    googlePlaceId,
    isMine: !!actor && createdBy === actor.user.id,
  } satisfies ApiVenueDetail);
});
