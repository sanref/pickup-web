import Link from "next/link";
import { VenueStatusBadge } from "@/components/venue/venue-card";
import { loadManagedVenue } from "./load";
import { ManageTabs } from "./manage-tabs";

export default async function ManageVenueLayout({ children, params }: LayoutProps<"/gestion/[venueId]">) {
  const { venueId } = await params;
  const { venue } = await loadManagedVenue(venueId);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 min-[900px]:px-10">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href="/gestion" className="w-fit">
            ← Mis sedes
          </Link>
          <Link href={`/sedes/${venue.id}`} className="w-fit text-text-3">
            Ver página pública
          </Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[34px] leading-tight font-bold tracking-[-0.03em]">{venue.name}</h1>
            <VenueStatusBadge status={venue.status} />
          </div>
          <span className="text-sm text-text-2">
            {venue.address} · {venue.city}
          </span>
        </div>
        <ManageTabs venueId={venue.id} />
      </div>
      {children}
    </div>
  );
}
