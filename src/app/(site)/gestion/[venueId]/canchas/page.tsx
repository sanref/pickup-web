import type { Metadata } from "next";
import { listActiveSports } from "@/server/services/profiles";
import { listCourts } from "@/server/services/venue-admin";
import { loadManagedVenue } from "../load";
import { CourtsManager } from "./courts-manager";

export const metadata: Metadata = { title: "Canchas" };

export default async function CourtsPage({ params }: PageProps<"/gestion/[venueId]/canchas">) {
  const { venueId } = await params;
  const { venue } = await loadManagedVenue(venueId);
  const [courts, sports] = await Promise.all([listCourts(venue.id), listActiveSports()]);
  return <CourtsManager venueId={venue.id} courts={courts} sports={sports.map(({ id, name }) => ({ id, name }))} />;
}
