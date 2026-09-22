import type { Metadata } from "next";
import { requireOnboardedActor } from "@/server/auth/session";
import { listActiveSports, listUserSports } from "@/server/services/profiles";
import { getVenue, type VenueSummary } from "@/server/services/venues";
import { NewMatchWizard } from "./new-match-wizard";

export const metadata: Metadata = { title: "Crear partido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewMatchPage({ searchParams }: PageProps<"/partidos/nuevo">) {
  const sede = (await searchParams).sede;
  const venueId = typeof sede === "string" && UUID.test(sede) ? sede : null;
  const actor = await requireOnboardedActor(venueId ? `/partidos/nuevo?sede=${venueId}` : "/partidos/nuevo");

  const [sports, mySports, venueResult] = await Promise.all([
    listActiveSports(),
    listUserSports(actor.user.id),
    venueId ? getVenue(actor, venueId) : Promise.resolve(null),
  ]);
  const found = venueResult && "venue" in venueResult ? venueResult.venue : null;
  const presetVenue: VenueSummary | null = found
    ? { id: found.id, name: found.name, address: found.address, city: found.city, status: found.status, location: found.location, sports: found.sports }
    : null;
  const preferred = presetVenue
    ? (mySports.find((s) => presetVenue.sports.some((vs) => vs.id === s.sportId))?.sportId ?? null)
    : (mySports[0]?.sportId ?? null);

  return (
    <div className="px-4 py-8 min-[900px]:px-10">
      <NewMatchWizard sports={sports} preferredSportId={preferred} presetVenue={presetVenue} />
    </div>
  );
}
