import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedActor } from "@/server/auth/session";
import { listActiveSports } from "@/server/services/profiles";
import { NewVenueFlow } from "./new-venue-flow";

export const metadata: Metadata = { title: "Proponer una sede" };

export default async function NewVenuePage() {
  await requireOnboardedActor("/sedes/nueva");
  const sports = await listActiveSports();

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 min-[900px]:px-10">
      <Link href="/sedes" className="w-fit text-sm">
        ← Todas las sedes
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[34px] leading-tight font-bold tracking-[-0.03em]">Proponer una sede</h1>
        <p className="m-0 text-sm text-text-2">Buscala en Google Maps. Si ya la tenemos, te la mostramos.</p>
      </div>
      <NewVenueFlow sports={sports} />
    </div>
  );
}
