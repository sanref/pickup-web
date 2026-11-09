import { redirect } from "next/navigation";
import { loadManagedVenue } from "./load";

export default async function ManageVenueIndex({ params }: PageProps<"/gestion/[venueId]">) {
  const { venueId } = await params;
  await loadManagedVenue(venueId);
  redirect(`/gestion/${venueId}/turnos`);
}
