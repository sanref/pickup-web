import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusTag } from "@/components/match/match-bits";
import { requireOnboardedActor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { getMatchDetail, getSlotVoters } from "@/server/services/matches";
import { ManagePanel } from "./manage-panel";

export const metadata: Metadata = { title: "Gestionar partido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ManageMatchPage({ params }: PageProps<"/partidos/[id]/gestionar">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const actor = await requireOnboardedActor(`/partidos/${id}/gestionar`);
  const match = await getMatchDetail(actor, id);
  if (!match || !(match.viewer.isOrganizer || isAdmin(actor))) notFound();
  const slots = await getSlotVoters(id);

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 py-8 min-[900px]:px-10">
      <Link href={`/partidos/${id}`} className="w-fit text-sm">
        ← Volver al partido
      </Link>
      <div className="flex flex-col gap-2">
        <StatusTag status={match.status} />
        <h1 className="m-0 text-[34px] leading-tight font-bold tracking-[-0.03em]">{match.title}</h1>
        <span className="text-sm text-text-2">
          {match.venue.name} · cupo {match.capacity}
        </span>
      </div>
      <ManagePanel
        matchId={id}
        status={match.status}
        capacity={match.capacity}
        timezone={match.venue.timezone}
        autoConfirm={match.autoConfirm}
        slots={slots}
        participants={match.participants}
        organizerId={match.organizer.userId}
      />
    </div>
  );
}
