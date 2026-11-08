import { similarVenuesSchema } from "@/lib/validations/venue";
import { requireApiActor } from "@/server/api/auth";
import { handle, ok, readJson } from "@/server/api/http";
import { findSimilarVenues } from "@/server/services/venues";

// Posibles duplicados antes de proponer una sede (mismo lugar de Google, muy cerca o nombre parecido).
export const POST = handle(async (request) => {
  await requireApiActor(request);
  return ok(await findSimilarVenues(await readJson(request, similarVenuesSchema)));
});
