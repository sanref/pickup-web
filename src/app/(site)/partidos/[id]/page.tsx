import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { StatusTag } from "@/components/match/match-bits";
import { Badge } from "@/components/ui/badge";
import { VenueMap } from "@/components/venue/venue-map";
import { withNext } from "@/lib/safe-next";
import { SKILL_LEVEL_LABELS } from "@/lib/validations/profile";
import { getActor } from "@/server/auth/session";
import { requestOrigin } from "@/server/request-origin";
import { getMatchDetail } from "@/server/services/matches";
import { MatchInteractive } from "./match-interactive";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const load = cache(async (id: string, invite: string | null) => {
  if (!UUID.test(id)) notFound();
  const actor = await getActor();
  const match = await getMatchDetail(actor, id, invite);
  if (!match) notFound();
  return { actor, match };
});

function inviteParam(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9]{6,40}$/.test(value) ? value : null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/partidos/[id]">): Promise<Metadata> {
  const { match } = await load((await params).id, inviteParam((await searchParams).invitacion));
  return {
    title: match.title,
    description: `${match.sport.name} en ${match.venue.name}. Votá el horario que te sirve y sumate.`,
    robots: match.visibility === "private" ? { index: false } : undefined,
  };
}

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default async function MatchPage({ params, searchParams }: PageProps<"/partidos/[id]">) {
  const id = (await params).id;
  const query = await searchParams;
  const invite = inviteParam(query.invitacion);
  const justCreated = query.nuevo === "1";
  const { actor, match } = await load(id, invite);

  const path = invite ? `/partidos/${id}?invitacion=${invite}` : `/partidos/${id}`;
  const origin = await requestOrigin();
  const shareUrl = match.visibility === "private" && match.inviteCode ? `${origin}/i/${match.inviteCode}` : `${origin}/partidos/${id}`;
  const shareText = `${match.title} · ${match.venue.name}. Votá el horario que te sirve: ${shareUrl}`;
  const levelLabel = match.level ? SKILL_LEVEL_LABELS[match.level].long : null;
  const directions = `https://www.google.com/maps/search/?api=1&query=${match.venue.location.lat},${match.venue.location.lng}`;

  const header = (
    <div className="flex flex-col gap-2.5">
      {justCreated && (
        <div role="status" className="mb-2 rounded-sm bg-coral-100 px-4 py-3 text-sm text-navy">
          Listo, tu partido está publicado. Compartilo por WhatsApp para que la gente vote los horarios.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StatusTag status={match.status} />
        <Badge variant="neutral">{[match.sport.name, levelLabel].filter(Boolean).join(" · ")}</Badge>
        <Badge variant="outline">{match.visibility === "public" ? "Público" : "Privado"}</Badge>
      </div>
      <h1 className="m-0 text-[34px] leading-[1.05] tracking-[-0.03em] sm:text-[48px]">{match.title}</h1>
      <p className="m-0 max-w-[560px] text-base whitespace-pre-line text-text-2">
        Partido armado por {match.organizer.displayName}.{match.description ? ` ${match.description}` : ""}
      </p>
    </div>
  );

  const sidebar = (
    <>
      <div className="flex flex-col overflow-hidden rounded-md border border-edge bg-surface shadow-sm">
        <VenueMap
          pins={[{ id: match.venue.id, lat: match.venue.location.lat, lng: match.venue.location.lng, label: match.venue.name }]}
          activeId={match.venue.id}
          className="h-[150px] rounded-none"
        />
        <div className="flex flex-col gap-2 px-[18px] py-4">
          <Link href={`/sedes/${match.venue.id}`} className="text-lg font-semibold tracking-[-0.02em] text-text no-underline">
            {match.venue.name}
          </Link>
          <span className="text-[13px] text-text-3">
            {match.venue.address} · {match.venue.city}
          </span>
          <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-1 text-[13px]">
            Cómo llegar
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-md border border-edge bg-surface p-[18px] shadow-sm">
        <span className="text-[13px] font-semibold text-text-3">Datos del partido</span>
        <DataRow label="Precio" value={match.pricePerPerson == null ? "A definir" : match.pricePerPerson === 0 ? "Gratis" : `${money.format(match.pricePerPerson)} p/p`} />
        <DataRow label="Nivel" value={levelLabel ?? "Cualquiera"} />
        <DataRow label="Cupo" value={`${match.capacity} jugadores`} />
        <DataRow label="Organiza" value={match.organizer.displayName} />
      </div>
    </>
  );

  return (
    <MatchInteractive
      match={{
        id: match.id,
        status: match.status,
        capacity: match.capacity,
        confirmedSlotId: match.confirmedSlotId,
        participants: match.participants,
        viewer: match.viewer,
        slots: match.slots,
        timezone: match.venue.timezone,
      }}
      played={match.played}
      me={actor ? { displayName: actor.profile.displayName, avatarUrl: actor.profile.avatarUrl } : null}
      invite={invite}
      loginHref={withNext("/login", path)}
      whatsappHref={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
      header={header}
      sidebar={sidebar}
    />
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-text-3">{label}</span>
      <strong className="text-right font-semibold">{value}</strong>
    </div>
  );
}
