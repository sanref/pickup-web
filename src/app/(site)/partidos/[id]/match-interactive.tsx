"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { LiveRefresh } from "@/components/match/live-refresh";
import { MatchRoster } from "@/components/match/match-roster";
import { SlotPollGrid, type GridSlot } from "@/components/match/slot-poll-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSlotDay, formatTime, formatWeekday } from "@/lib/dates";
import type { MatchActionResult } from "@/server/match-action";
import type { MatchDetail } from "@/server/services/matches";
import { joinMatchAction, leaveMatchAction, setVotesAction } from "./actions";

type Props = {
  match: Pick<MatchDetail, "id" | "status" | "capacity" | "confirmedSlotId" | "participants" | "viewer"> & {
    slots: GridSlot[];
    timezone: string;
  };
  played: boolean;
  me: { displayName: string; avatarUrl: string | null } | null;
  invite: string | null;
  loginHref: string;
  whatsappHref: string;
  header: React.ReactNode;
  sidebar: React.ReactNode;
};

type Phase = "voting" | "confirmed" | "closed";

export function MatchInteractive(props: Props) {
  const { match, played, me, invite, loginHref, whatsappHref } = props;
  const { id: matchId, capacity, timezone, viewer } = match;
  const [pending, startTransition] = useTransition();
  const [mySlots, setMySlots] = useOptimistic(viewer.slotIds);

  const phase: Phase = match.status === "open" ? "voting" : match.status === "confirmed" && !played ? "confirmed" : "closed";
  const serverMine = new Set(viewer.slotIds);
  const mine = new Set(mySlots);
  // Conteos recalculados con el voto optimista: se descuenta lo que el servidor tenía de mí y se suma lo local.
  const slots = match.slots.map((s) => ({ ...s, votes: s.votes - (serverMine.has(s.id) ? 1 : 0) + (mine.has(s.id) ? 1 : 0) }));
  const isParticipant = viewer.isParticipant || mine.size > 0;
  const others = match.participants.filter((p) => p.userId !== viewer.userId);
  const total = others.length + (isParticipant ? 1 : 0);
  const confirmedCount = match.participants.filter((p) => p.status === "confirmed").length;

  const leading = slots.reduce<GridSlot | null>((best, s) => (s.votes > 0 && (!best || s.votes > best.votes) ? s : best), null);
  const confirmedSlot = slots.find((s) => s.id === match.confirmedSlotId) ?? null;
  const missing = phase === "voting" ? (leading ? capacity - leading.votes : capacity) : capacity - confirmedCount;
  const full = missing <= 0;
  const inRoster = viewer.status === "confirmed" || viewer.status === "waitlist";

  function report<T>(result: MatchActionResult<T>) {
    if (!result.ok) toast.error(result.error);
    return result;
  }

  function toggle(slotId: string) {
    const next = mine.has(slotId) ? mySlots.filter((sid) => sid !== slotId) : [...mySlots, slotId];
    startTransition(async () => {
      setMySlots(next);
      report(await setVotesAction({ matchId, slotIds: next, invite: invite ?? undefined }));
    });
  }

  function join() {
    startTransition(async () => {
      const result = report(await joinMatchAction({ matchId, invite: invite ?? undefined }));
      if (!result.ok) return;
      if (result.value === "confirmed") toast.success("¡Adentro! Quedaste confirmado.");
      else if (result.value === "waitlist") toast.success("Estás en la lista de espera. Te avisamos si se libera un lugar.");
      else toast.success("Te sumaste. Marcá los horarios que te sirven.");
    });
  }

  function leave() {
    startTransition(async () => {
      if (phase === "voting") setMySlots([]);
      const result = report(await leaveMatchAction({ matchId, invite: invite ?? undefined }));
      if (result.ok) toast.success("Te bajaste del partido.");
    });
  }

  const kicker =
    phase === "voting"
      ? leading
        ? `Si se confirma el ${formatWeekday(leading.startsAt, timezone)}`
        : "Todavía sin votos"
      : confirmedSlot
        ? `${formatSlotDay(confirmedSlot.startsAt, timezone)} · ${formatTime(confirmedSlot.startsAt, timezone)}`
        : "";
  const headline =
    phase === "closed"
      ? match.status === "cancelled"
        ? "Partido cancelado"
        : "Ya se jugó"
      : full
        ? phase === "voting"
          ? "Esa opción ya llegó al cupo"
          : "Cupo completo"
        : `${missing === 1 ? "Falta 1" : `Faltan ${missing}`} para el cupo`;

  // Acción principal según el estado del partido y del que mira.
  let primary: React.ReactNode = null;
  if (phase === "voting" && !isParticipant) {
    primary = me ? (
      <Button className="w-full" onClick={join} disabled={pending}>
        Me sumo
      </Button>
    ) : (
      <Button asChild className="w-full">
        <Link href={loginHref}>Me sumo</Link>
      </Button>
    );
  } else if (phase === "confirmed" && !inRoster) {
    const label = full ? "Anotarme en la lista de espera" : "Me sumo";
    const variant = full ? "secondary" : "default";
    primary = me ? (
      <Button className="w-full" variant={variant} onClick={join} disabled={pending}>
        {label}
      </Button>
    ) : (
      <Button asChild className="w-full" variant={variant}>
        <Link href={loginHref}>{label}</Link>
      </Button>
    );
  }

  let status: string | null = null;
  if (me && phase !== "closed") {
    if (viewer.status === "confirmed") status = viewer.isOrganizer ? "Organizás este partido y estás confirmado." : "Estás confirmado.";
    else if (viewer.status === "waitlist") status = `Sos suplente · ${viewer.waitlistPosition ?? "?"}º en espera. Te avisamos si se libera un lugar.`;
    else if (phase === "voting" && isParticipant)
      status = `${viewer.isOrganizer ? "Organizás este partido." : "Estás anotado."} ${
        mine.size ? `Te sirven ${mine.size === 1 ? "1 horario" : `${mine.size} horarios`}.` : "Marcá qué horarios te sirven."
      }`;
    else if (phase === "confirmed" && viewer.status === "interested")
      status = "Se confirmó un horario que no votaste. Si te sirve, sumate.";
  }
  const canLeave = me && !viewer.isOrganizer && phase !== "closed" && (inRoster || isParticipant);

  return (
    <div className="mx-auto grid w-full max-w-[1280px] items-start gap-8 px-4 pt-6 pb-28 min-[900px]:grid-cols-[1fr_360px] min-[900px]:px-10 min-[900px]:pb-11">
      <LiveRefresh paused={pending || phase === "closed"} />
      <div className="flex min-w-0 flex-col gap-6">
        {props.header}

        {match.status === "cancelled" && (
          <div className="rounded-md border border-accent px-4 py-3 text-sm text-accent-800">El organizador canceló este partido.</div>
        )}

        {phase === "voting" ? (
          <section className="flex flex-col gap-3.5">
            <h2 className="m-0 font-heading text-[22px]">¿Qué horarios te sirven?</h2>
            <SlotPollGrid
              slots={slots}
              capacity={capacity}
              timezone={timezone}
              leadingSlotId={leading?.id ?? null}
              people={others}
              me={me ? { ...me, isOrganizer: viewer.isOrganizer, slotIds: mine } : null}
              loginHref={loginHref}
              open
              canVote={!!me}
              onToggle={toggle}
            />
          </section>
        ) : (
          confirmedSlot && (
            <section className="flex flex-col gap-3.5">
              <h2 className="m-0 font-heading text-[22px]">
                {phase === "closed" && match.status !== "cancelled" ? "Se jugó el" : "Se juega el"}{" "}
                {formatWeekday(confirmedSlot.startsAt, timezone)} {formatSlotDay(confirmedSlot.startsAt, timezone).split(" ")[1]} a las{" "}
                {formatTime(confirmedSlot.startsAt, timezone)}
              </h2>
              <MatchRoster participants={match.participants} capacity={capacity} viewerId={viewer.userId} />
            </section>
          )
        )}

        {phase === "voting" && (
          <section className="flex flex-col gap-3">
            <h2 className="m-0 font-heading text-xl">Quiénes van</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent-2">{total === 1 ? "1 anotado" : `${total} anotados`}</Badge>
              <Badge variant="outline">Cupo {capacity}</Badge>
            </div>
            <p className="m-0 max-w-[620px] text-[13px] text-neutral-700">
              Cuando el organizador confirme un horario, los que votaron esa opción pasan a confirmados por orden de voto. Al
              resto le llega un aviso para sumarse si queda lugar.
            </p>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <div className="flex flex-col gap-3.5 rounded-md bg-surface p-5 shadow-md">
          <div className="flex flex-col gap-0.5">
            {kicker && <span className="text-xs tracking-[0.08em] text-neutral-600 uppercase">{kicker}</span>}
            <span className="font-heading text-2xl">{headline}</span>
          </div>

          {primary}
          {status && <div className="rounded-md bg-accent-2-100 px-4 py-3 text-center text-sm text-accent-2-800">{status}</div>}

          {viewer.isOrganizer && phase !== "closed" && (
            <Button asChild variant={phase === "voting" && full ? "default" : "secondary"} className="w-full">
              <Link href={`/partidos/${matchId}/gestionar`}>{phase === "voting" ? "Gestionar y confirmar" : "Gestionar"}</Link>
            </Button>
          )}
          {phase !== "closed" && (
            <Button asChild variant="secondary" className="w-full">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                Compartir por WhatsApp
              </a>
            </Button>
          )}

          {canLeave ? (
            <Button variant="ghost" className="self-center" onClick={leave} disabled={pending}>
              Bajarme del partido
            </Button>
          ) : (
            phase === "voting" && (
              <span className="text-center text-xs text-neutral-700">Al sumarte quedás como interesado hasta que se confirme el horario.</span>
            )
          )}
        </div>
        {props.sidebar}
      </aside>

      {/* Mobile: la tarjeta de acción queda fija al pie (handoff, responsive). */}
      {phase !== "closed" && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-surface px-4 py-3 shadow-lg min-[900px]:hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            {kicker && <span className="truncate text-[11px] tracking-[0.08em] text-neutral-600 uppercase">{kicker}</span>}
            <span className="truncate font-heading text-lg leading-tight">{headline}</span>
          </div>
          {primary ? (
            <div className="shrink-0 [&_[data-slot=button]]:w-auto">{primary}</div>
          ) : viewer.isOrganizer ? (
            <Button asChild variant="secondary">
              <Link href={`/partidos/${matchId}/gestionar`}>Gestionar</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                Compartir
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
