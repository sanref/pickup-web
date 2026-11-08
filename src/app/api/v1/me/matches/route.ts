import { requireApiActor } from "@/server/api/auth";
import { handle, ok } from "@/server/api/http";
import { listMyMatches } from "@/server/services/matches";

// Mis partidos: organizados o anotado (próximos, en votación e historial; el cliente los agrupa).
export const GET = handle(async (request) => {
  return ok(await listMyMatches(await requireApiActor(request)));
});
