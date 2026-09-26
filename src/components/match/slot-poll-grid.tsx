"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/profile/user-avatar";
import { formatSlotDay, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AvatarStack, CapacityBar, VoteMark } from "./match-bits";

export type GridSlot = { id: string; startsAt: Date; votes: number };
export type GridPerson = { userId: string; displayName: string; avatarUrl: string | null; isOrganizer: boolean; slotIds: string[] };

type Props = {
  slots: GridSlot[];
  capacity: number;
  timezone: string;
  leadingSlotId: string | null;
  people: GridPerson[];
  me: { displayName: string; avatarUrl: string | null; isOrganizer: boolean; slotIds: Set<string> } | null;
  loginHref: string;
  open: boolean;
  canVote: boolean;
  onToggle: (slotId: string) => void;
};

// Cabecera de cada opción: fondo navy; la que va ganando invierte a coral con todo el texto en navy.
function SlotHeader({ slot, capacity, timezone, leading }: { slot: GridSlot; capacity: number; timezone: string; leading: boolean }) {
  const missing = capacity - slot.votes;
  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-4 py-[15px] text-center", leading ? "bg-coral" : "bg-navy")}>
      <span className={cn("text-xs font-semibold", leading ? "text-navy" : "text-navy-300")}>
        {formatSlotDay(slot.startsAt, timezone)}
        {leading && " · va ganando"}
      </span>
      <span className={cn("font-display text-[26px] leading-none tabular", leading ? "text-navy" : "text-surface")}>
        {formatTime(slot.startsAt, timezone)}
      </span>
      <span className={cn("text-xs tabular", leading ? "text-navy" : "text-navy-200")}>
        {slot.votes} de {capacity}
        {leading && missing > 0 && ` · faltan ${missing}`}
      </span>
      <CapacityBar value={slot.votes} capacity={capacity} tone={leading ? "on-coral" : "on-navy"} className="h-1.5" />
    </div>
  );
}

// Tu celda: votado = círculo navy con check coral; sin votar = círculo punteado que en hover pasa a navy.
function MyVoteButton({ voted, disabled, onClick, label }: { voted: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={voted}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-full transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45 min-[700px]:size-10",
        voted
          ? "bg-navy text-coral hover:bg-navy-600"
          : "border-2 border-dashed border-[#cbb0a6] bg-transparent hover:border-navy hover:bg-white",
      )}
    >
      {voted && <Check className="size-[18px]" />}
    </button>
  );
}

export function SlotPollGrid(props: Props) {
  const { slots, capacity, timezone, leadingSlotId, people, me, loginHref, open, canVote, onToggle } = props;
  // Con más de 4 opciones el grid scrollea y la columna de nombres queda fija.
  const columns = { gridTemplateColumns: `186px repeat(${slots.length}, minmax(140px, 1fr))` };
  const leadingCell = (slotId: string) => slotId === leadingSlotId && "bg-coral-050";

  return (
    <div className="overflow-hidden rounded-lg bg-surface shadow-md">
      {/* Matriz: desde 700px */}
      <div className="hidden overflow-x-auto min-[700px]:block">
        <div className="grid" style={columns} role="table" aria-label="Votación de horarios">
          <div className="sticky left-0 z-10 bg-navy px-[18px] py-4" />
          {slots.map((slot) => (
            <SlotHeader key={slot.id} slot={slot} capacity={capacity} timezone={timezone} leading={slot.id === leadingSlotId} />
          ))}

          {me ? (
            <>
              <div className="sticky left-0 z-10 flex items-center gap-2.5 bg-coral-100 px-[18px] py-3">
                <UserAvatar name={me.displayName} src={me.avatarUrl} className="size-[29px]" textClassName="text-[11px]" />
                <span className="text-sm font-bold">Vos</span>
                {me.isOrganizer && <OrgTag />}
              </div>
              {slots.map((slot) => (
                <div key={slot.id} className="grid place-items-center bg-coral-100 p-2.5">
                  <MyVoteButton
                    voted={me.slotIds.has(slot.id)}
                    disabled={!canVote}
                    onClick={() => onToggle(slot.id)}
                    label={`${formatSlotDay(slot.startsAt, timezone)} ${formatTime(slot.startsAt, timezone)}`}
                  />
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-full flex flex-wrap items-center justify-between gap-3 bg-coral-100 px-[18px] py-3">
              <span className="text-sm font-semibold">Iniciá sesión para votar los horarios</span>
              <Button asChild size="sm" variant="navy">
                <Link href={loginHref}>Entrar</Link>
              </Button>
            </div>
          )}

          {people.map((p) => (
            <div key={p.userId} className="contents" role="row">
              <div className="sticky left-0 z-10 flex items-center gap-2.5 border-t border-border bg-surface px-[18px] py-[11px]">
                <UserAvatar name={p.displayName} src={p.avatarUrl} className="size-[26px]" textClassName="text-[10px]" />
                <span className="truncate text-sm whitespace-nowrap">{p.displayName}</span>
                {p.isOrganizer && <OrgTag />}
              </div>
              {slots.map((slot) => (
                <div key={slot.id} className={cn("grid place-items-center border-t border-border", leadingCell(slot.id))}>
                  <VoteMark voted={p.slotIds.includes(slot.id)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Opciones apiladas: debajo de 700px la matriz no entra */}
      <ul className="m-0 flex list-none flex-col gap-2.5 p-2.5 min-[700px]:hidden">
        {slots.map((slot) => {
          const leading = slot.id === leadingSlotId;
          const voters = [
            ...(me && me.slotIds.has(slot.id) ? [{ userId: "me", displayName: me.displayName, avatarUrl: me.avatarUrl }] : []),
            ...people.filter((p) => p.slotIds.includes(slot.id)),
          ];
          const voted = !!me?.slotIds.has(slot.id);
          return (
            <li key={slot.id} className={cn("flex flex-col gap-3 rounded-sm p-4", leading ? "bg-coral-050" : "bg-page")}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className={cn("text-xs font-semibold", leading ? "text-coral-700" : "text-text-3")}>
                    {formatSlotDay(slot.startsAt, timezone)}
                    {leading && " · va ganando"}
                  </span>
                  <span className="font-display text-[26px] leading-tight tabular">{formatTime(slot.startsAt, timezone)}</span>
                </div>
                {me ? (
                  <button
                    type="button"
                    aria-pressed={voted}
                    disabled={!canVote}
                    onClick={() => onToggle(slot.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-45",
                      voted ? "bg-navy text-coral" : "border-2 border-dashed border-[#cbb0a6] text-navy",
                    )}
                  >
                    {voted && <Check className="size-4" />}
                    {voted ? "Me sirve" : "¿Te sirve?"}
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs tabular text-text-3">
                  {slot.votes} de {capacity}
                  {capacity - slot.votes > 0 && ` · faltan ${capacity - slot.votes}`}
                </span>
                <CapacityBar value={slot.votes} capacity={capacity} />
              </div>
              {voters.length > 0 && <AvatarStack people={voters} max={8} edgeClassName={leading ? "border-coral-050" : "border-page"} />}
            </li>
          );
        })}
        {!me && (
          <li className="flex items-center justify-between gap-3 rounded-sm bg-coral-100 p-4">
            <span className="text-sm font-semibold">Iniciá sesión para votar los horarios</span>
            <Button asChild size="sm" variant="navy">
              <Link href={loginHref}>Entrar</Link>
            </Button>
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-3 bg-surface-alt px-[18px] py-[13px]">
        <span className="text-[13px] text-text-2">
          {!open
            ? "La votación está cerrada."
            : me
              ? "Tocá los círculos de tu fila para marcar lo que te sirve. Se guarda solo."
              : "Podés ver lo que votó cada uno. Para votar necesitás una cuenta."}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-text-3">
          <span className="inline-block size-[7px] rounded-full bg-navy" />
          en vivo
        </span>
      </div>
    </div>
  );
}

function OrgTag() {
  return (
    <Badge variant="outline" className="px-2 py-0.5 text-[11px]">
      org
    </Badge>
  );
}
