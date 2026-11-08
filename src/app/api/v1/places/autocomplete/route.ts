import { DEFAULT_CENTER } from "@/lib/geo";
import { placesAutocompleteQuerySchema } from "@/lib/validations/api";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readQuery } from "@/server/api/http";
import { autocompletePlaces } from "@/server/services/places";

// Sugerencias de Google Places para proponer una sede. Solo con sesión (cada búsqueda se paga).
export const GET = handle(async (request) => {
  await requireApiActor(request);
  const { q, lat, lng, session } = readQuery(request, placesAutocompleteQuerySchema);
  const center = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER;
  return ok(await autocompletePlaces(q, center, session));
});
