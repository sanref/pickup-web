import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VenueStatusBadge } from "@/components/venue/venue-card";
import { VenueMap } from "@/components/venue/venue-map";
import { getActor } from "@/server/auth/session";
import { canManageVenue } from "@/server/services/venue-admin";
import { getVenue } from "@/server/services/venues";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  if (!UUID.test(id)) notFound();
  const result = await getVenue(await getActor(), id);
  if (!result) notFound();
  if ("redirectTo" in result) permanentRedirect(`/sedes/${result.redirectTo}`);
  return result.venue;
}

export async function generateMetadata({ params }: PageProps<"/sedes/[id]">): Promise<Metadata> {
  const venue = await load((await params).id);
  return { title: venue.name, description: `${venue.address}, ${venue.city}` };
}

export default async function VenuePage({ params, searchParams }: PageProps<"/sedes/[id]">) {
  const venue = await load((await params).id);
  const canManage = await canManageVenue(await getActor(), venue.id);
  const alreadyExisted = (await searchParams).existente === "1";
  const directions = `https://www.google.com/maps/search/?api=1&query=${venue.location.lat},${venue.location.lng}`;

  return (
    <div className="mx-auto grid w-full max-w-[1280px] items-start gap-8 px-4 py-8 min-[900px]:grid-cols-[1fr_480px] min-[900px]:px-10">
      <div className="flex flex-col gap-5">
        <Link href="/sedes" className="w-fit text-sm">
          ← Todas las sedes
        </Link>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[34px] leading-tight font-bold tracking-[-0.03em]">{venue.name}</h1>
            <VenueStatusBadge status={venue.status} />
          </div>
          <span className="text-text-2">
            {venue.address} · {venue.city}
          </span>
        </div>
        {alreadyExisted && (
          <div className="rounded-md bg-coral-100 px-4 py-3 text-sm text-navy">
            Esta sede ya estaba cargada, así que usamos la que había.
          </div>
        )}
        {venue.status === "pending" && (
          <div className="rounded-md bg-coral-100 px-4 py-3 text-sm text-navy">
            La estamos revisando. Mientras tanto ya podés armar partidos acá.
          </div>
        )}
        {venue.sports.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-text/70">Se juega</span>
            <div className="flex flex-wrap gap-2">
              {venue.sports.map((s) => (
                <Badge key={s.id} variant="neutral">
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href={`/partidos/nuevo?sede=${venue.id}`}>Armar un partido acá</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={directions} target="_blank" rel="noopener noreferrer">
              Cómo llegar
            </a>
          </Button>
          {canManage && (
            <Button asChild variant="navy">
              <Link href={`/gestion/${venue.id}/turnos`}>Gestionar sede</Link>
            </Button>
          )}
        </div>
      </div>
      <VenueMap
        pins={[{ id: venue.id, lat: venue.location.lat, lng: venue.location.lng, label: venue.name }]}
        activeId={venue.id}
        className="h-[320px] min-[900px]:h-[480px]"
      />
    </div>
  );
}
