"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { VenueSummary } from "@/server/services/venues";
import { VenueCard } from "./venue-card";
import { VenueMap } from "./venue-map";

// Lista + mapa sincronizados: la tarjeta bajo el mouse resalta su pin; el pin abre la sede.
export function VenueBrowser({ venues }: { venues: VenueSummary[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const pins = useMemo(
    () => venues.map((v) => ({ id: v.id, lat: v.location.lat, lng: v.location.lng, label: v.name })),
    [venues],
  );
  const openVenue = useCallback((id: string) => router.push(`/sedes/${id}`), [router]);

  return (
    <div className="grid items-start gap-6 min-[900px]:grid-cols-[1fr_420px]">
      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
        {venues.map((venue) => (
          <li key={venue.id} onMouseEnter={() => setActiveId(venue.id)} onMouseLeave={() => setActiveId(null)}>
            <Link href={`/sedes/${venue.id}`} className="block text-text no-underline">
              <VenueCard venue={venue} active={venue.id === activeId} />
            </Link>
          </li>
        ))}
      </ul>
      <VenueMap
        pins={pins}
        activeId={activeId}
        onPinClick={openVenue}
        className="order-first h-[320px] min-[900px]:sticky min-[900px]:top-[calc(var(--site-header-h)+1rem)] min-[900px]:order-none min-[900px]:h-[620px]"
      />
    </div>
  );
}
