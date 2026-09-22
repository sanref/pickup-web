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

function SlotHeader({ slot, capacity, timezone, leading }: { slot: GridSlot; capacity: number; timezone: string; leading: boolean }) {
  const missing = capacity - slot.votes;
  return (
    <div className={cn("flex flex-col items-center gap-1.5 border-b border-l border-neutral-300 px-4 py-3.5 text-center", leading && "bg-accent-2-100")}>
      <span className={cn("text-[11px] tracking-[0.08em] uppercase", leading ? "text-accent-2-700" : "text-neutral-600")}>
        {formatSlotDay(slot.startsAt, timezone)}
        {leading && " · va ganando"}
      </span>
      <span className="font-heading text-[22px] leading-none">{formatTime(slot.startsAt, timezone)}</span>
      <span className={cn("text-xs", leading ? "text-accent-2-800" : "text-neutral-700")}>
        {slot.votes} de {capacity}
        {leading && missing > 0 && ` · faltan ${missing}`}
      </span>
      <CapacityBar value={slot.votes} capacity={capacity} leading={leading} />
    </div>
  );
}

function MyVoteButton({ voted, disabled, onClick, label }: { voted: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={voted}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-[38px] place-items-center rounded-full transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45",
        voted
          ? "bg-accent-2-600 text-accent-2-100 hover:bg-accent-2-700"
          : "border-2 border-dashed border-neutral-400 bg-transparent hover:border-accent hover:bg-accent-100",
      )}
    >
      {voted && <Check className="size-[17px]" strokeWidth={2.75} />}
    </button>
  );
}

export function SlotPollGrid(props: Props) {
  const { slots, capacity, timezone, leadingSlotId, people, me, loginHref, open, canVote, onToggle } = props;
  const columns = { gridTemplateColumns: `172px repeat(${slots.length}, minmax(96px, 1fr))` };
  const leadingCell = (slotId: string) => slotId === leadingSlotId && "bg-[#f7fcef]";

  return (
    <div className="overflow-hidden rounded-[24px] bg-neutral-100 shadow-sm">
      {/* Matriz: desde 700px */}
      <div className="hidden overflow-x-auto min-[700px]:block">
        <div className="grid" style={columns} role="table" aria-label="Votación de horarios">
          <div className="border-b border-neutral-300 px-[18px] py-4" />
          {slots.map((slot) => (
            <SlotHeader key={slot.id} slot={slot} capacity={capacity} timezone={timezone} leading={slot.id === leadingSlotId} />
          ))}

          {me ? (
            <>
              <div className="flex items-center gap-2.5 bg-accent-200 px-[18px] py-3">
                <UserAvatar name={me.displayName} src={me.avatarUrl} className="size-7" textClassName="bg-accent-300 text-[11px] text-accent-800" />
                <span className="text-sm font-bold">Vos</span>
                {me.isOrganizer && <OrgTag />}
              </div>
              {slots.map((slot) => (
                <div key={slot.id} className="grid place-items-center border-l border-neutral-300 bg-accent-200 p-2.5">
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
            <div className="col-span-full flex flex-wrap items-center justify-between gap-3 bg-accent-200 px-[18px] py-3">
              <span className="text-sm font-semibold">Iniciá sesión para votar</span>
              <Button asChild size="sm">
                <Link href={loginHref}>Iniciar sesión</Link>
              </Button>
            </div>
          )}

          {people.map((p) => (
            <div key={p.userId} className="contents" role="row">
              <div className="flex items-center gap-2.5 border-t border-neutral-200 px-[18px] py-[11px]">
                <UserAvatar name={p.displayName} src={p.avatarUrl} className="size-[26px]" textClassName="text-[10px]" />
                <span className="truncate text-sm">{p.displayName}</span>
                {p.isOrganizer && <OrgTag />}
              </div>
              {slots.map((slot) => (
                <div key={slot.id} className={cn("grid place-items-center border-t border-l border-neutral-200 border-l-neutral-300", leadingCell(slot.id))}>
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
            <li key={slot.id} className={cn("flex flex-col gap-3 rounded-md p-4", leading ? "bg-accent-2-100" : "bg-background")}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className={cn("text-[11px] tracking-[0.08em] uppercase", leading ? "text-accent-2-700" : "text-neutral-600")}>
                    {formatSlotDay(slot.startsAt, timezone)}
                    {leading && " · va ganando"}
                  </span>
                  <span className="font-heading text-[22px] leading-tight">{formatTime(slot.startsAt, timezone)}</span>
                </div>
                {me ? (
                  <button
                    type="button"
                    aria-pressed={voted}
                    disabled={!canVote}
                    onClick={() => onToggle(slot.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-45",
                      voted ? "bg-accent-2-600 text-accent-2-100" : "border-2 border-dashed border-neutral-400 text-foreground",
                    )}
                  >
                    {voted && <Check className="size-4" strokeWidth={2.75} />}
                    {voted ? "Me sirve" : "¿Te sirve?"}
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-neutral-700">
                  {slot.votes} de {capacity}
                  {capacity - slot.votes > 0 && ` · faltan ${capacity - slot.votes}`}
                </span>
                <CapacityBar value={slot.votes} capacity={capacity} leading={leading} />
              </div>
              {voters.length > 0 && <AvatarStack people={voters} max={8} />}
            </li>
          );
        })}
        {!me && (
          <li className="flex items-center justify-between gap-3 rounded-md bg-accent-200 p-4">
            <span className="text-sm font-semibold">Iniciá sesión para votar</span>
            <Button asChild size="sm">
              <Link href={loginHref}>Iniciar sesión</Link>
            </Button>
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-3 bg-neutral-200 px-[18px] py-3.5">
        <span className="text-[13px] text-neutral-800">
          {!open ? "La votación está cerrada." : me ? "Tocá los círculos de tu fila para marcar lo que te sirve. Se guarda solo." : "Cada uno marca los horarios que le sirven."}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-700">
          <span className="inline-block size-[7px] rounded-full bg-accent-2" />
          en vivo
        </span>
      </div>
    </div>
  );
}

function OrgTag() {
  return (
    <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
      org
    </Badge>
  );
}
