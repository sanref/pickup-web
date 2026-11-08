import { handle, ok } from "@/server/api/http";
import { listActiveSports } from "@/server/services/profiles";

// Catálogo de deportes activos. Público.
export const GET = handle(async () => ok(await listActiveSports()));
