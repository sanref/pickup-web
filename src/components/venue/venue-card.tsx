import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VenueSummary } from "@/server/services/venues";

export function VenueStatusBadge({ status }: { status: VenueSummary["status"] }) {
  if (status === "pending") return <Badge variant="outline">En revisión</Badge>;
  if (status === "rejected") return <Badge variant="outline">Rechazada</Badge>;
  return null;
}

export function VenueCard({ venue, active = false }: { venue: VenueSummary; active?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border-2 bg-surface p-4 shadow-sm transition-colors duration-150 ease-out",
        active ? "border-coral shadow-md" : "border-edge",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-semibold">{venue.name}</span>
        <div className="flex shrink-0 items-center gap-2">
          {venue.distanceKm != null && (
            <span className="text-xs tabular text-text-3">
              {venue.distanceKm.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km
            </span>
          )}
          <VenueStatusBadge status={venue.status} />
        </div>
      </div>
      <span className="text-sm text-text-2">
        {venue.address} · {venue.city}
      </span>
      {venue.sports.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {venue.sports.map((s) => (
            <Badge key={s.id} variant="neutral">
              {s.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
