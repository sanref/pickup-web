import { buttonVariants } from "@/components/ui/button";
import { formatDayOfMonth, formatShortWeekday, formatSlotDay, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { SKILL_LEVEL_LABELS } from "@/lib/validations/profile";
import type { MatchSearchResult } from "@/server/services/search";
import { AvatarStack, CapacityBar, MissingCount, StatusTag } from "./match-bits";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function formatDistance(km: number): string {
  if (km < 1) return `a ${Math.max(100, Math.round(km * 10) * 100)} m`;
  return `a ${km.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
}

function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return price === 0 ? "Gratis" : `${money.format(price)} p/p`;
}

/** "Jue 24/9 · 20:00 o 21:00" si las opciones son del mismo día; si no, "Jue 24/9 · 20:00 y 2 opciones más". */
function slotSummary(slots: Date[], timeZone: string): string {
  const [first] = slots;
  if (!first) return "";
  const day = formatSlotDay(first, timeZone);
  if (slots.every((s) => formatSlotDay(s, timeZone) === day)) {
    return `${day} · ${slots.map((s) => formatTime(s, timeZone)).join(" o ")}`;
  }
  const more = slots.length - 1;
  return `${day} · ${formatTime(first, timeZone)} y ${more === 1 ? "1 opción más" : `${more} opciones más`}`;
}

/** "Jue 20:00": etiqueta corta de la próxima opción, para los pines del mapa. */
export function nextSlotLabel(match: Pick<MatchSearchResult, "slots" | "venue">): string {
  const [first] = match.slots;
  return first ? `${formatShortWeekday(first, match.venue.timezone)} ${formatTime(first, match.venue.timezone)}` : "";
}

// Monograma del deporte: "F5" para Fútbol 5; si no hay número, inicial + primera consonante ("PD" para Pádel).
function sportMonogram(name: string): string {
  const plain = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const digits = plain.match(/\d+/)?.[0];
  if (digits) return `${plain[0]}${digits}`;
  const consonant = plain.slice(1).match(/[B-DF-HJ-NP-TV-Z]/)?.[0] ?? plain[1] ?? "";
  return `${plain[0]}${consonant}`;
}

export function SportMonogram({ sport, className }: { sport: MatchSearchResult["sport"]; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full font-heading text-[13px]",
        sport.id % 2 ? "bg-accent-200 text-accent-700" : "bg-accent-2-200 text-accent-2-800",
        className,
      )}
    >
      {sportMonogram(sport.name)}
    </span>
  );
}

// Fila de /explorar (MatchCard del handoff): fecha a la izquierda, datos al medio, "faltan N" y acción a la derecha.
// La tarjeta activa (mouse encima o pin elegido) lleva borde terracota de 2px.
export function MatchCard({ match, active = false }: { match: MatchSearchResult; active?: boolean }) {
  const tz = match.venue.timezone;
  const [first] = match.slots;
  const level = match.level ? SKILL_LEVEL_LABELS[match.level].long : "Todos los niveles";
  const meta = [match.venue.name, formatDistance(match.distanceKm), level, formatPrice(match.pricePerPerson)].filter(Boolean).join(" · ");
  const moreSlots = match.slots.length - 1;
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr] items-center gap-y-3 rounded-md border-2 bg-surface p-4 transition-colors duration-150 ease-out sm:grid-cols-[auto_1fr_auto] sm:p-[18px]",
        active ? "border-accent shadow-sm" : "border-transparent",
      )}
    >
      <div className="flex w-[74px] flex-col items-center justify-center border-r border-neutral-300 pr-4">
        {first && (
          <>
            <span className="text-[11px] tracking-[0.08em] text-neutral-600 uppercase">{formatShortWeekday(first, tz)}</span>
            <span className="font-heading text-[28px] leading-[1.1]">{formatDayOfMonth(first, tz)}</span>
            <span className="text-xs text-neutral-700">{formatTime(first, tz)}</span>
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-[5px] pl-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-[19px] leading-tight">{match.title}</span>
          <StatusTag status={match.status} />
        </div>
        <span className="text-[13px] text-neutral-700">
          {meta}
          {moreSlots > 0 && ` · ${moreSlots === 1 ? "1 horario más" : `${moreSlots} horarios más`}`}
        </span>
        <div className="mt-0.5 flex items-center gap-2.5">
          <CapacityBar value={match.filled} capacity={match.capacity} className="h-2 w-[120px]" />
          <span className="text-xs text-neutral-700">
            {match.filled} de {match.capacity}
          </span>
        </div>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end sm:pl-3">
        <MissingCount missing={match.missing} />
        <span className={cn(buttonVariants({ variant: active ? "default" : "secondary" }))}>
          {match.viewerJoined ? "Ver partido" : "Me sumo"}
        </span>
      </div>
    </div>
  );
}

// Tarjeta compacta de "Cerca tuyo" en la landing.
export function MatchTile({ match }: { match: MatchSearchResult }) {
  const price = formatPrice(match.pricePerPerson);
  return (
    <div className="flex h-full flex-col gap-3 rounded-md bg-surface p-5 transition-shadow duration-150 ease-out hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <SportMonogram sport={match.sport} />
        <StatusTag status={match.status} />
        <span className="ml-auto">
          <MissingCount missing={match.missing} />
        </span>
      </div>
      <span className="font-heading text-[19px] leading-[1.15]">{match.title}</span>
      <div className="flex flex-col gap-1 text-[13px] text-neutral-700">
        <span>{slotSummary(match.slots, match.venue.timezone)}</span>
        <span>
          {match.venue.name} · {formatDistance(match.distanceKm)}
        </span>
      </div>
      <div className="mt-auto flex items-center gap-2.5 pt-1">
        <AvatarStack people={match.people} max={2} total={match.participantCount} edgeClassName="border-surface" />
        {price && <span className="ml-auto text-xs text-neutral-700">{price}</span>}
      </div>
    </div>
  );
}
