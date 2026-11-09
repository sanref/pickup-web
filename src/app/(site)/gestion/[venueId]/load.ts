import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireActor } from "@/server/auth/session";
import { getManagedVenue } from "@/server/services/venue-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Layout y páginas de /gestion/[venueId] se renderizan en paralelo: cada uno valida el permiso,
// y cache() hace que la consulta se haga una sola vez por request. Sin permiso, la ruta no existe.
export const loadManagedVenue = cache(async (venueId: string) => {
  if (!UUID.test(venueId)) notFound();
  const actor = await requireActor(`/gestion/${venueId}`);
  const venue = await getManagedVenue(actor, venueId);
  if (!venue) notFound();
  return { actor, venue };
});
