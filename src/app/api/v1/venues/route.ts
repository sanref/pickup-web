import { searchVenuesQuerySchema } from "@/lib/validations/api";
import { createVenueSchema } from "@/lib/validations/venue";
import { getApiActor, requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson, readQuery } from "@/server/api/http";
import { createVenue, searchVenues } from "@/server/services/venues";

// Buscar sedes del catálogo (por nombre o dirección, deporte y cercanía). Público: sin sesión,
// solo las verificadas; con sesión, también las propias pendientes.
export const GET = handle(async (request) => {
  const { q, sportId, lat, lng, limit } = readQuery(request, searchVenuesQuerySchema);
  const near = lat != null && lng != null ? { lat, lng } : undefined;
  return ok(await searchVenues(await getApiActor(request), { q, sportId, near, limit }));
});

// Proponer una sede desde Google Places. Si ya existe (mismo lugar), devuelve esa con existing: true.
export const POST = handle(async (request) => {
  const actor = await requireApiActor(request);
  const input = await readJson(request, createVenueSchema);
  const result = await createVenue(actor, input);
  return ok(result, result.existing ? 200 : 201);
});
