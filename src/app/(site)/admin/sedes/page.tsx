import type { Metadata } from "next";
import { SubmitButton } from "@/components/auth/submit-button";
import { VenueCard } from "@/components/venue/venue-card";
import { requireActor } from "@/server/auth/session";
import { assertAdmin } from "@/server/authz";
import { listPendingVenues } from "@/server/services/venues";
import { mergeVenueAction, reviewVenueAction } from "./actions";

export const metadata: Metadata = { title: "Moderar sedes" };

export default async function AdminVenuesPage() {
  assertAdmin(await requireActor("/admin/sedes"));
  const pending = await listPendingVenues();

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-8 min-[900px]:px-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-heading text-[34px] leading-tight">Sedes para revisar</h1>
        <p className="m-0 text-sm text-neutral-800">
          {pending.length === 0
            ? "No hay propuestas pendientes."
            : `${pending.length} ${pending.length === 1 ? "propuesta" : "propuestas"} de usuarios, de la más vieja a la más nueva.`}
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-6 p-0">
        {pending.map((venue) => (
          <li key={venue.id} className="flex flex-col gap-3 rounded-lg border border-divider p-4">
            <VenueCard venue={venue} />
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${venue.location.lat},${venue.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm"
              >
                Ver en Google Maps
              </a>
              <form action={reviewVenueAction} className="ml-auto">
                <input type="hidden" name="venueId" value={venue.id} />
                <input type="hidden" name="decision" value="rejected" />
                <SubmitButton variant="ghost" pendingLabel="Rechazando…">
                  Rechazar
                </SubmitButton>
              </form>
              <form action={reviewVenueAction}>
                <input type="hidden" name="venueId" value={venue.id} />
                <input type="hidden" name="decision" value="verified" />
                <SubmitButton pendingLabel="Aprobando…">Aprobar</SubmitButton>
              </form>
            </div>

            {venue.similar.length > 0 && (
              <div className="flex flex-col gap-2.5 border-t border-divider pt-3">
                <span className="text-xs text-foreground/70">Parecidas cerca: si es un duplicado, fusionala con la que queda.</span>
                {venue.similar.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <VenueCard venue={s} />
                    </div>
                    <form action={mergeVenueAction}>
                      <input type="hidden" name="venueId" value={venue.id} />
                      <input type="hidden" name="intoId" value={s.id} />
                      <SubmitButton variant="secondary" pendingLabel="Fusionando…">
                        Fusionar con esta
                      </SubmitButton>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
