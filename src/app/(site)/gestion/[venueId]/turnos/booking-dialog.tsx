"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, FormMessage } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDateKey, minutesToTime, zonedDateKey, zonedMinutes } from "@/lib/dates";
import { durationOptions, formatDuration } from "@/lib/validations/venue-admin";
import { cancelBookingAction, createBookingAction, updateBookingAction } from "../../actions";
import type { CalendarBookingItem, CalendarCourt } from "./booking-calendar";

export type DialogState =
  | { mode: "create"; courtId: string; date: string; time: string }
  | { mode: "edit"; booking: CalendarBookingItem }
  | { mode: "match"; booking: CalendarBookingItem };

export function BookingDialog({
  venueId,
  timezone,
  courts,
  state,
  onClose,
}: {
  venueId: string;
  timezone: string;
  courts: CalendarCourt[];
  state: DialogState | null;
  onClose: () => void;
}) {
  const key = !state ? "none" : state.mode === "create" ? `new-${state.courtId}-${state.date}-${state.time}` : state.booking.id;
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {state?.mode === "match" ? (
          <MatchBookingInfo booking={state.booking} timezone={timezone} courts={courts} />
        ) : state ? (
          <BookingForm key={key} venueId={venueId} timezone={timezone} courts={courts} state={state} onDone={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function describe(booking: CalendarBookingItem, timezone: string) {
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  return {
    date: zonedDateKey(start, timezone),
    time: minutesToTime(zonedMinutes(start, timezone)),
    endTime: minutesToTime(zonedMinutes(end, timezone)),
    duration: Math.round((end.getTime() - start.getTime()) / 60_000),
  };
}

function MatchBookingInfo({ booking, timezone, courts }: { booking: CalendarBookingItem; timezone: string; courts: CalendarCourt[] }) {
  const d = describe(booking, timezone);
  const court = courts.find((c) => c.id === booking.courtId);
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{booking.match?.title ?? "Partido"}</DialogTitle>
        <DialogDescription>
          {court?.name} · {formatDateKey(d.date)} · {d.time}–{d.endTime}
        </DialogDescription>
      </DialogHeader>
      <p className="m-0 text-sm text-text-2">
        Es un partido de PickUp confirmado en esta cancha. Lo maneja el organizador: si lo cancela, el turno se libera solo.
      </p>
      {booking.match && (
        <Button asChild variant="navy" className="self-start">
          <Link href={`/partidos/${booking.match.id}`}>Ver el partido</Link>
        </Button>
      )}
    </div>
  );
}

function BookingForm({
  venueId,
  timezone,
  courts,
  state,
  onDone,
}: {
  venueId: string;
  timezone: string;
  courts: CalendarCourt[];
  state: Extract<DialogState, { mode: "create" | "edit" }>;
  onDone: () => void;
}) {
  const editing = state.mode === "edit" ? state.booking : null;
  const [draft, setDraft] = useState(() => {
    if (state.mode === "edit") {
      const editing = state.booking;
      const d = describe(editing, timezone);
      return {
        courtId: editing.courtId,
        date: d.date,
        time: d.time,
        durationMinutes: d.duration,
        customerName: editing.customerName ?? "",
        customerPhone: editing.customerPhone ?? "",
        notes: editing.notes ?? "",
      };
    }
    const court = courts.find((c) => c.id === state.courtId);
    return {
      courtId: state.courtId,
      date: state.date,
      time: state.time,
      durationMinutes: court?.slotMinutes ?? 60,
      customerName: "",
      customerPhone: "",
      notes: "",
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const court = courts.find((c) => c.id === draft.courtId);
  const options = court ? durationOptions(court.slotMinutes) : [];
  if (!options.includes(draft.durationMinutes)) options.push(draft.durationMinutes);
  options.sort((a, b) => a - b);
  const selectable = courts.filter((c) => c.isActive || c.id === editing?.courtId);

  function chooseCourt(courtId: string) {
    const next = courts.find((c) => c.id === courtId);
    const fits = next && draft.durationMinutes % next.slotMinutes === 0;
    setDraft({ ...draft, courtId, durationMinutes: fits ? draft.durationMinutes : (next?.slotMinutes ?? draft.durationMinutes) });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateBookingAction(venueId, editing.id, draft) : await createBookingAction(venueId, draft);
      if (!result.ok) return setError(result.error);
      toast.success(editing ? "Guardamos el turno." : "Turno reservado.");
      onDone();
    });
  }

  function cancel() {
    if (!editing || !window.confirm("¿Cancelar este turno? El horario queda libre.")) return;
    startTransition(async () => {
      const result = await cancelBookingAction(venueId, editing.id);
      if (!result.ok) return setError(result.error);
      toast.success("Cancelamos el turno.");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Turno" : "Nuevo turno"}</DialogTitle>
        <DialogDescription>
          {court ? `${court.name} · turnos de ${formatDuration(court.slotMinutes)} o múltiplos.` : "Elegí la cancha."}
        </DialogDescription>
      </DialogHeader>
      <FormMessage kind="error">{error}</FormMessage>

      <Field id="booking-court" label="Cancha">
        <NativeSelect id="booking-court" value={draft.courtId} onChange={(e) => chooseCourt(e.target.value)}>
          {selectable.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.sportName}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
        <Field id="booking-date" label="Fecha">
          <Input id="booking-date" type="date" value={draft.date} required onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </Field>
        <Field id="booking-time" label="Desde">
          <Input
            id="booking-time"
            type="time"
            step={900}
            value={draft.time}
            required
            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
          />
        </Field>
        <Field id="booking-duration" label="Duración">
          <NativeSelect
            id="booking-duration"
            value={String(draft.durationMinutes)}
            onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })}
          >
            {options.map((m) => (
              <option key={m} value={m}>
                {formatDuration(m)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="booking-name" label="A nombre de (opcional)">
          <Input
            id="booking-name"
            value={draft.customerName}
            maxLength={80}
            onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
          />
        </Field>
        <Field id="booking-phone" label="Teléfono (opcional)">
          <Input
            id="booking-phone"
            type="tel"
            value={draft.customerPhone}
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })}
          />
        </Field>
      </div>
      <Field id="booking-notes" label="Notas (opcional)">
        <textarea
          id="booking-notes"
          value={draft.notes}
          maxLength={500}
          rows={2}
          placeholder="Seña pagada, pide pelota…"
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        {editing && (
          <Button type="button" variant="destructive" disabled={pending} onClick={cancel}>
            Cancelar turno
          </Button>
        )}
        <Button type="button" variant="ghost" className="ml-auto" disabled={pending} onClick={onDone}>
          Cerrar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : editing ? "Guardar" : "Reservar"}
        </Button>
      </div>
    </form>
  );
}
