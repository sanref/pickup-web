import { DEFAULT_CENTER } from "@/lib/geo";
import { searchMatchesQuerySchema } from "@/lib/validations/api";
import { createMatchSchema } from "@/lib/validations/match";
import { getApiActor, requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson, readQuery } from "@/server/api/http";
import { createMatch } from "@/server/services/matches";
import { searchMatches } from "@/server/services/search";

// Explorar: partidos públicos con lugar cerca de un punto. Público (con sesión marca `viewerJoined`).
// Sin lat/lng se busca en la ciudad piloto; la app manda la ubicación del teléfono o la zona elegida.
export const GET = handle(async (request) => {
  const q = readQuery(request, searchMatchesQuerySchema);
  const center = q.lat != null && q.lng != null ? { lat: q.lat, lng: q.lng } : DEFAULT_CENTER;
  const result = await searchMatches(await getApiActor(request), {
    center,
    radiusKm: q.km,
    sportId: q.sportId,
    level: q.level,
    when: q.when,
    sort: q.sort,
    limit: q.limit,
  });
  return ok(result);
});

// Crear un partido (mismo cuerpo que el asistente de la web). Responde 201 con { id }.
export const POST = handle(async (request) => {
  const actor = await requireApiActor(request);
  const input = await readJson(request, createMatchSchema);
  return ok(await createMatch(actor, input), 201);
});
