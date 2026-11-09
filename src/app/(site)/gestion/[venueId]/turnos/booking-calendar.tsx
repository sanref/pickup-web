"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { addDaysToKey, formatDateKey, minutesToTime, zonedMinutes, zonedToUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BookingDialog, type DialogState } from "./booking-dialog";

export type CalendarView = "day" | "week";
export type CalendarCourt = { id: string; name: string; sportName: string; slotMinutes: number; isActive: boolean };
export type CalendarBookingItem = {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  match: { id: string; title: string } | null;
};
export type CalendarTentativeItem = {
  slotId: string;
  matchId: string;
  title: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  votes: number;
  capacity: number;
};

const HOUR_PX = 52;
const PX_PER_MIN = HOUR_PX / 60;
const DEFAULT_START_HOUR = 8;

type Column = { key: string; title: string; subtitle: string; court: CalendarCourt; date: string };
type Placed<T> = { item: T; top: number; height: number; startMin: number; endMin: number };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Ubica [inicio, fin) dentro del día local de la columna, recortado a 00:00–24:00. */
function placeInDay(startsAt: string, endsAt: string, dayStart: number) {
  const startMin = (Date.parse(startsAt) - dayStart) / 60_000;
  const endMin = (Date.parse(endsAt) - dayStart) / 60_000;
  if (endMin <= 0 || startMin >= 1440) return null;
  return { startMin: Math.max(0, startMin), endMin: Math.min(1440, endMin) };
}

export function BookingCalendar({
  venueId,
  timezone,
  view,
  date,
  from,
  today,
  selectedCourtId,
  courts,
  bookings,
  tentative,
}: {
  venueId: string;
  timezone: string;
  view: CalendarView;
  date: string;
  from: string;
  today: string;
  selectedCourtId: string;
  courts: CalendarCourt[];
  bookings: CalendarBookingItem[];
  tentative: CalendarTentativeItem[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  // La línea de "ahora" se calcula en el cliente (evita diferencias de hidratación) y se mueve cada minuto.
  useEffect(() => {
    const tick = () => setNowMin(zonedMinutes(new Date(), timezone));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [timezone]);

  const selectedCourt = courts.find((c) => c.id === selectedCourtId) ?? courts[0];
  const columns: Column[] =
    view === "day"
      ? courts.map((court) => ({
          key: court.id,
          title: court.name,
          subtitle: court.isActive ? court.sportName : `${court.sportName} · desactivada`,
          court,
          date,
        }))
      : Array.from({ length: 7 }, (_, i) => {
          const day = addDaysToKey(from, i);
          return {
            key: day,
            title: capitalize(formatDateKey(day, { weekday: "short" }).replace(".", "")),
            subtitle: formatDateKey(day, { day: "numeric", month: "numeric" }),
            court: selectedCourt,
            date: day,
          };
        });

  const placed = columns.map((col) => {
    const dayStart = zonedToUtc(col.date, "00:00", timezone).getTime();
    const place = <T extends { courtId: string; startsAt: string; endsAt: string }>(items: T[]): Placed<T>[] =>
      items.flatMap((item) => {
        if (item.courtId !== col.court.id) return [];
        const p = placeInDay(item.startsAt, item.endsAt, dayStart);
        return p ? [{ item, ...p, top: 0, height: 0 }] : [];
      });
    return { col, bookings: place(bookings), tentative: place(tentative) };
  });

  const earliest = Math.min(
    DEFAULT_START_HOUR * 60,
    ...placed.flatMap((p) => [...p.bookings, ...p.tentative].map((e) => e.startMin)),
  );
  const startHour = Math.floor(earliest / 60);
  const hours = Array.from({ length: 24 - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * HOUR_PX;
  const position = <T,>(e: Placed<T>): Placed<T> => ({
    ...e,
    top: (e.startMin - startHour * 60) * PX_PER_MIN,
    height: Math.max((e.endMin - e.startMin) * PX_PER_MIN, 18),
  });

  function href(patch: { fecha?: string; vista?: CalendarView; cancha?: string }) {
    const params = new URLSearchParams();
    params.set("fecha", patch.fecha ?? date);
    if ((patch.vista ?? view) === "week") params.set("vista", "semana");
    const cancha = patch.cancha ?? (view === "week" ? selectedCourt.id : undefined);
    if (cancha) params.set("cancha", cancha);
    return `/gestion/${venueId}/turnos?${params}`;
  }

  const step = view === "week" ? 7 : 1;
  const title =
    view === "day"
      ? capitalize(formatDateKey(date))
      : `Semana del ${formatDateKey(from, { day: "numeric", month: "short" })} al ${formatDateKey(addDaysToKey(from, 6), { day: "numeric", month: "short" })}`;
  const activeCourts = courts.filter((c) => c.isActive);

  function openCreate(court: CalendarCourt, day: string, minutes: number) {
    if (!court.isActive) return;
    const snapped = Math.floor(minutes / court.slotMinutes) * court.slotMinutes;
    setDialog({ mode: "create", courtId: court.id, date: day, time: minutesToTime(Math.min(snapped, 1440 - court.slotMinutes)) });
  }

  function onColumnClick(event: React.MouseEvent<HTMLDivElement>, col: Column) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    openCreate(col.court, col.date, startHour * 60 + (event.clientY - rect.top) / PX_PER_MIN);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon-sm" aria-label={view === "week" ? "Semana anterior" : "Día anterior"}>
            <Link href={href({ fecha: addDaysToKey(date, -step) })}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={href({ fecha: today })}>Hoy</Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label={view === "week" ? "Semana siguiente" : "Día siguiente"}>
            <Link href={href({ fecha: addDaysToKey(date, step) })}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <h2 className="m-0 text-[21px] tracking-[-0.02em]">{title}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            aria-label="Ir a la fecha"
            className="h-9 w-[160px]"
            onChange={(e) => e.target.value && router.push(href({ fecha: e.target.value }))}
          />
          <Segmented
            name="calendar-view"
            label="Vista"
            size="sm"
            value={view}
            options={[
              { value: "day", label: "Día" },
              { value: "week", label: "Semana" },
            ]}
            onChange={(v) => router.push(href({ vista: v, cancha: v === "week" ? selectedCourt.id : undefined }))}
          />
          {view === "week" && (
            <NativeSelect
              aria-label="Cancha"
              value={selectedCourt.id}
              className="w-[180px] [&_select]:h-9"
              onChange={(e) => router.push(href({ cancha: e.target.value }))}
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
          <Button
            size="sm"
            disabled={activeCourts.length === 0}
            onClick={() => {
              const court = view === "week" && selectedCourt.isActive ? selectedCourt : activeCourts[0];
              if (court) setDialog({ mode: "create", courtId: court.id, date, time: "18:00" });
            }}
          >
            <Plus /> Nuevo turno
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-3">
        <Legend className="bg-navy" label="Turno" />
        <Legend className="border-l-4 border-coral bg-coral-100" label="Partido de PickUp confirmado" />
        <Legend className="border border-dashed border-navy-300 bg-surface" label="Partido en votación (todavía no reserva)" />
        <span>Tocá un espacio libre para dar un turno.</span>
      </div>

      <div className="max-h-[72vh] overflow-auto rounded-lg border border-edge bg-surface shadow-sm">
        <div className="grid min-w-fit" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(150px, 1fr))` }}>
          {/* Encabezado */}
          <div className="sticky top-0 left-0 z-30 border-b border-border bg-surface" />
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "sticky top-0 z-20 flex flex-col border-b border-l border-border bg-surface px-2.5 py-2",
                col.date === today && view === "week" && "bg-coral-050",
              )}
            >
              <span className="truncate text-sm font-semibold">{col.title}</span>
              <span className="truncate text-xs text-text-3">{col.subtitle}</span>
            </div>
          ))}

          {/* Horas */}
          <div className="sticky left-0 z-10 bg-surface" style={{ height: gridHeight }}>
            {hours.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-text-4" style={{ top: i * HOUR_PX }}>
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>

          {placed.map(({ col, bookings: colBookings, tentative: colTentative }) => (
            <div
              key={col.key}
              onClick={(e) => onColumnClick(e, col)}
              className={cn(
                "relative border-l border-border",
                col.court.isActive ? "cursor-cell hover:bg-navy/[0.02]" : "bg-inset",
              )}
              style={{
                height: gridHeight,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
              }}
            >
              {colBookings.map(position).map(({ item, top, height, startMin, endMin }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDialog(item.match ? { mode: "match", booking: item } : { mode: "edit", booking: item })}
                  className={cn(
                    "absolute inset-x-1 z-10 flex flex-col overflow-hidden rounded-sm px-2 py-1 text-left text-xs leading-tight shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-coral",
                    item.match ? "border-l-4 border-coral bg-coral-100 text-navy" : "bg-navy text-surface hover:bg-navy-600",
                  )}
                  style={{ top, height }}
                >
                  <span className="font-semibold tabular-nums">
                    {minutesToTime(startMin)}–{minutesToTime(endMin)}
                  </span>
                  {height > 30 && (
                    <span className="truncate">{item.match ? item.match.title : item.customerName || "Turno"}</span>
                  )}
                </button>
              ))}
              {colTentative.map(position).map(({ item, top, height, startMin }) => (
                <Link
                  key={item.slotId}
                  href={`/partidos/${item.matchId}`}
                  title={`${item.title} · ${item.votes} de ${item.capacity} votos`}
                  className="absolute right-1 z-20 flex w-[46%] flex-col overflow-hidden rounded-sm border border-dashed border-navy-300 bg-surface/90 px-1.5 py-1 text-[11px] leading-tight text-text-2 no-underline hover:border-navy"
                  style={{ top, height }}
                >
                  <span className="tabular-nums">{minutesToTime(startMin)} · en votación</span>
                  {height > 30 && (
                    <span className="truncate">
                      {item.votes}/{item.capacity} · {item.title}
                    </span>
                  )}
                </Link>
              ))}
              {col.date === today && nowMin !== null && nowMin >= startHour * 60 && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-coral"
                  style={{ top: (nowMin - startHour * 60) * PX_PER_MIN }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <BookingDialog
        venueId={venueId}
        timezone={timezone}
        courts={courts}
        state={dialog}
        onClose={() => setDialog(null)}
      />
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block h-3 w-5 rounded-[3px]", className)} />
      {label}
    </span>
  );
}
