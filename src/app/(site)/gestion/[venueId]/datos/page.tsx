import type { Metadata } from "next";
import { isAdmin } from "@/server/authz";
import { listActiveSports } from "@/server/services/profiles";
import { listVenueManagers } from "@/server/services/venue-admin";
import { loadManagedVenue } from "../load";
import { ManagersSection } from "./managers-section";
import { VenueDataForm } from "./venue-data-form";

export const metadata: Metadata = { title: "Datos de la sede" };

export default async function VenueDataPage({ params }: PageProps<"/gestion/[venueId]/datos">) {
  const { venueId } = await params;
  const { actor, venue } = await loadManagedVenue(venueId);
  const [sports, managers] = await Promise.all([listActiveSports(), listVenueManagers(venue.id)]);

  return (
    <div className="flex max-w-[720px] flex-col gap-10">
      <VenueDataForm
        venueId={venue.id}
        sports={sports.map(({ id, name }) => ({ id, name }))}
        initial={{ name: venue.name, phone: venue.phone ?? "", sportIds: venue.sports.map((s) => s.id) }}
        address={`${venue.address} · ${venue.city}`}
      />
      <ManagersSection venueId={venue.id} managers={managers} canEdit={isAdmin(actor)} currentUserId={actor.user.id} />
    </div>
  );
}
