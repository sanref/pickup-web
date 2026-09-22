"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { LiveRefresh } from "@/components/match/live-refresh";
import { SlotPollGrid, type GridPerson, type GridSlot } from "@/components/match/slot-poll-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatWeekday } from "@/lib/dates";
import { joinMatchAction, leaveMatchAction, setVotesAction } from "./actions";

type Props = {
  matchId: string;
  status: string;
  capacity: number;
  timezone: string;
  slots: GridSlot[];
  participants: GridPerson[];
  viewer: { userId: string | null; isOrganizer: boolean; isParticipant: boolean; slotIds: string[] };
  me: { displayName: string; avatarUrl: string | null } | null;
  invite: string | null;
  loginHref: string;
  whatsappHref: string;
  header: React.ReactNode;
  sidebar: React.ReactNode;
};

export function MatchInteractive(props: Props) {
  const { matchId, status, capacity, timezone, viewer, me, invite, loginHref, whatsappHref } = props;
  const [pending, startTransition] = useTransition();
  const [mySlots, setMySlots] = useOptimistic(viewer.slotIds);
  const [joined, setJoined] = useOptimistic(viewer.isParticipant);

  const open = status === "open";
  const serverMine = new Set(viewer.slotIds);
  const mine = new Set(mySlots);
  // Conteos recalculados con el voto optimista: se descuenta lo que el servidor tenía de mí y se suma lo local.
  const slots = props.slots.map((s) => ({ ...s, votes: s.votes - (serverMine.has(s.id) ? 1 : 0) + (mine.has(s.id) ? 1 : 0) }));
  const isParticipant = joined || mine.size > 0;
  const others = props.participants.filter((p) => p.userId !== viewer.userId);
  const total = others.length + (isParticipant ? 1 : 0);

  const leading = slots.reduce<GridSlot | null>((best, s) => (s.votes > 0 && (!best || s.votes > best.votes) ? s : best), null);
  const missing = leading ? capacity - leading.votes : capacity;

  function report(result: { ok: boolean; error?: string }) {
    if (!result.ok) toast.error(result.error ?? "No pudimos guardar el cambio.");
  }

  function toggle(slotId: string) {
    const next = mine.has(slotId) ? mySlots.filter((id) => id !== slotId) : [...mySlots, slotId];
    startTransition(async () => {
      setMySlots(next);
      report(await setVotesAction({ matchId, slotIds: next, invite: invite ?? undefined }));
    });
  }

  function join() {
    startTransition(async () => {
      setJoined(true);
      const result = await joinMatchAction({ matchId, invite: invite ?? undefined });
      report(result);
      if (result.ok) toast.success("Te sumaste. Marcá los horarios que te sirven.");
    });
  }

  function leave() {
    startTransition(async () => {
      setJoined(false);
      setMySlots([]);
      const result = await leaveMatchAction({ matchId, invite: invite ?? undefined });
      report(result);
      if (result.ok) toast.success("Te bajaste del partido.");
    });
  }

  const meRow = me
    ? { displayName: me.displayName, avatarUrl: me.avatarUrl, isOrganizer: viewer.isOrganizer, slotIds: mine }
    : null;

  return (
    <div className="mx-auto grid w-full max-w-[1280px] items-start gap-8 px-4 pt-6 pb-28 min-[900px]:grid-cols-[1fr_360px] min-[900px]:px-10 min-[900px]:pb-11">
      <LiveRefresh paused={pending} />
      <div className="flex min-w-0 flex-col gap-6">
        {props.header}

        <section className="flex flex-col gap-3.5">
          <h2 className="m-0 font-heading text-[22px]">¿Qué horarios te sirven?</h2>
          <SlotPollGrid
            slots={slots}
            capacity={capacity}
            timezone={timezone}
            leadingSlotId={leading?.id ?? null}
            people={others}
            me={meRow}
            loginHref={loginHref}
            open={open}
            canVote={open && !!me}
            onToggle={toggle}
          />
        </section>

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
      </div>

      <aside className="flex flex-col gap-4">
        <div className="flex flex-col gap-3.5 rounded-md bg-surface p-5 shadow-md">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs tracking-[0.08em] text-neutral-600 uppercase">
              {leading ? `Si se confirma el ${formatWeekday(leading.startsAt, timezone)}` : "Todavía sin votos"}
            </span>
            <span className="font-heading text-2xl">
              {missing > 0 ? `${missing === 1 ? "Falta 1" : `Faltan ${missing}`} para el cupo` : "Esa opción ya llegó al cupo"}
            </span>
          </div>

          {open && !me && (
            <Button asChild className="w-full">
              <Link href={loginHref}>Me sumo</Link>
            </Button>
          )}
          {open && me && !isParticipant && (
            <Button className="w-full" onClick={join} disabled={pending}>
              Me sumo
            </Button>
          )}
          {me && isParticipant && (
            <div className="rounded-md bg-accent-2-100 px-4 py-3 text-center text-sm text-accent-2-800">
              {viewer.isOrganizer ? "Organizás este partido." : "Estás anotado."}{" "}
              {open && (mine.size ? `Te sirven ${mine.size === 1 ? "1 horario" : `${mine.size} horarios`}.` : "Marcá qué horarios te sirven.")}
            </div>
          )}

          <Button asChild variant="secondary" className="w-full">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              Compartir por WhatsApp
            </a>
          </Button>

          {open && me && isParticipant && !viewer.isOrganizer ? (
            <Button variant="ghost" className="self-center" onClick={leave} disabled={pending}>
              Bajarme del partido
            </Button>
          ) : (
            <span className="text-center text-xs text-neutral-700">
              Al sumarte quedás como interesado hasta que se confirme el horario.
            </span>
          )}
        </div>
        {props.sidebar}
      </aside>

      {/* Mobile: la tarjeta de acción queda fija al pie (handoff, responsive). */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-surface px-4 py-3 shadow-lg min-[900px]:hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[11px] tracking-[0.08em] text-neutral-600 uppercase">
            {leading ? `Si se confirma el ${formatWeekday(leading.startsAt, timezone)}` : "Todavía sin votos"}
          </span>
          <span className="font-heading text-lg leading-tight">
            {missing > 0 ? `${missing === 1 ? "Falta 1" : `Faltan ${missing}`} para el cupo` : "Llegó al cupo"}
          </span>
        </div>
        {open && !me ? (
          <Button asChild>
            <Link href={loginHref}>Me sumo</Link>
          </Button>
        ) : open && me && !isParticipant ? (
          <Button onClick={join} disabled={pending}>
            Me sumo
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              Compartir
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
