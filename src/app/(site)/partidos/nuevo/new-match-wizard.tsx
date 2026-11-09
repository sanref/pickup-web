"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Field, FormMessage } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { VenueCard } from "@/components/venue/venue-card";
import { timeToMinutes, todayIn } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DURATIONS, MAX_SLOTS, type SlotInput } from "@/lib/validations/match";
import { SKILL_LEVEL_LABELS, SKILL_LEVELS, type SkillLevel } from "@/lib/validations/profile";
import { compactDurationOptions, formatDuration } from "@/lib/validations/venue-admin";
import type { Sport } from "@/server/services/profiles";
import type { CourtOption } from "@/server/services/venue-admin";
import type { VenueSummary } from "@/server/services/venues";
import { createMatchAction, getCourtBusyAction, listCourtsForMatchAction, searchVenuesForMatchAction } from "./actions";

const STEPS = [
  { title: "¿Qué se juega?", description: "Elegí el deporte. El cupo sugerido lo podés cambiar al final." },
  { title: "¿Dónde?", description: "Buscá la sede en el catálogo y, si querés, elegí la cancha." },
  { title: "¿Cuándo?", description: `Proponé hasta ${MAX_SLOTS} horarios posibles. Cada uno vota los que le sirven.` },
  { title: "Detalles", description: "Lo último antes de publicarlo." },
] as const;

// Duración típica de un turno según el deporte.
const DEFAULT_DURATION: Record<string, SlotInput["durationMinutes"]> = { padel: 90, voley: 90 };
const LEVEL_OPTIONS = [
  { value: "any" as const, label: "Cualquiera" },
  ...SKILL_LEVELS.map((value) => ({ value, label: SKILL_LEVEL_LABELS[value].long })),
];
const TIMEZONE = "America/Argentina/Buenos_Aires";

/** Duración que más se parece a la actual entre las que admite la cancha (o las de siempre, sin cancha). */
function fitDuration(current: number, court: CourtOption | null): number {
  const options: readonly number[] = court ? compactDurationOptions(court.slotMinutes) : DURATIONS;
  return options.find((d) => d >= current) ?? options[options.length - 1] ?? current;
}

type Draft = {
  sportId: number | null;
  venue: VenueSummary | null;
  court: CourtOption | null;
  slots: SlotInput[];
  title: string;
  description: string;
  capacity: string;
  level: SkillLevel | "any";
  price: string;
  visibility: "public" | "private";
};

export function NewMatchWizard({
  sports,
  preferredSportId,
  presetVenue,
  presetHasCourts = false,
}: {
  sports: Sport[];
  preferredSportId: number | null;
  presetVenue: VenueSummary | null;
  /** La sede precargada tiene canchas del deporte inicial: se arranca en "¿Dónde?" para elegirla. */
  presetHasCourts?: boolean;
}) {
  const presetSport = presetVenue?.sports.length === 1 ? presetVenue.sports[0].id : preferredSportId;
  const [step, setStep] = useState(presetVenue && presetSport ? (presetHasCourts ? 1 : 2) : 0);
  const [draft, setDraft] = useState<Draft>(() => {
    const sport = sports.find((s) => s.id === presetSport);
    return {
      sportId: presetSport,
      venue: presetVenue,
      court: null,
      slots: [{ date: "", time: "20:00", durationMinutes: DEFAULT_DURATION[sport?.slug ?? ""] ?? 60 }],
      title: "",
      description: "",
      capacity: sport ? String(sport.defaultCapacity) : "",
      level: "any",
      price: "",
      visibility: "public",
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sport = sports.find((s) => s.id === draft.sportId) ?? null;
  const today = todayIn(TIMEZONE);

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function chooseSport(s: Sport) {
    const duration = DEFAULT_DURATION[s.slug] ?? 60;
    update({
      sportId: s.id,
      capacity: String(s.defaultCapacity),
      slots: draft.slots.map((slot) => ({ ...slot, durationMinutes: duration })),
      venue: draft.venue && draft.venue.sports.some((vs) => vs.id === s.id) ? draft.venue : null,
      // Las canchas son de un deporte: al cambiarlo hay que volver a elegirla.
      court: s.id === draft.sportId ? draft.court : null,
    });
  }

  function chooseVenue(venue: VenueSummary) {
    if (venue.id === draft.venue?.id) return;
    update({ venue, court: null, slots: draft.slots.map((s) => ({ ...s, durationMinutes: fitDuration(s.durationMinutes, null) })) });
  }

  function chooseCourt(court: CourtOption | null) {
    update({ court, slots: draft.slots.map((s) => ({ ...s, durationMinutes: fitDuration(s.durationMinutes, court) })) });
  }

  const durationChoices: readonly number[] = draft.court ? compactDurationOptions(draft.court.slotMinutes) : DURATIONS;

  function validate(): string | null {
    if (step === 0 && !draft.sportId) return "Elegí un deporte.";
    if (step === 1 && !draft.venue) return "Elegí la sede.";
    if (step === 2) {
      if (draft.slots.some((s) => !s.date || !s.time)) return "Completá la fecha y la hora de cada horario.";
      const keys = draft.slots.map((s) => `${s.date} ${s.time}`);
      if (new Set(keys).size !== keys.length) return "Hay dos horarios iguales.";
    }
    if (step === 3) {
      const capacity = Number(draft.capacity);
      if (!Number.isInteger(capacity) || capacity < 2 || capacity > 30) return "El cupo tiene que ser entre 2 y 30.";
      if (draft.price && !(Number(draft.price) >= 0)) return "Revisá el precio.";
    }
    return null;
  }

  function next(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    if (step === 2 && !draft.title && sport && draft.venue) {
      update({ title: `${sport.name} en ${draft.venue.name}`.slice(0, 80) });
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    startTransition(async () => {
      const result = await createMatchAction({
        sportId: draft.sportId,
        venueId: draft.venue?.id,
        courtId: draft.court?.id ?? null,
        title: draft.title,
        description: draft.description,
        capacity: Number(draft.capacity),
        level: draft.level === "any" ? null : draft.level,
        pricePerPerson: draft.price === "" ? null : Number(draft.price),
        visibility: draft.visibility,
        slots: draft.slots,
      });
      if (result?.error) setError(result.error);
    });
  }

  const current = STEPS[step];

  return (
    <form
      onSubmit={next}
      className="mx-auto flex w-full max-w-[720px] flex-col gap-5 rounded-lg border border-edge bg-surface px-5 py-7 shadow-xl sm:p-[34px]"
    >
      <div className="flex gap-1.5" role="progressbar" aria-label={`Paso ${step + 1} de ${STEPS.length}`} aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        {STEPS.map((s, i) => (
          <div key={s.title} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-150", i <= step ? "bg-coral" : "bg-neutral-300")} />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[29px] leading-tight font-bold tracking-[-0.03em]">{current.title}</h1>
        <p className="m-0 text-sm text-text-2">{current.description}</p>
      </div>

      <FormMessage kind="error">{error}</FormMessage>

      {step === 0 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Deporte">
          {sports.map((s) => {
            const on = s.id === draft.sportId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => chooseSport(s)}
                className={cn(
                  "min-h-11 rounded-full px-4 text-sm transition-colors duration-150",
                  on ? "bg-coral text-navy" : "tag-neutral hover:bg-neutral-300",
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <>
          <VenueStep sportId={draft.sportId} selected={draft.venue} onSelect={chooseVenue} />
          {draft.venue && draft.sportId && (
            <CourtStep venueId={draft.venue.id} sportId={draft.sportId} selected={draft.court} onSelect={chooseCourt} />
          )}
        </>
      )}

      {step === 2 && draft.court && (
        <p className="m-0 text-[13px] text-text-3">
          Cancha: <strong className="font-semibold text-text-2">{draft.court.name}</strong> · turnos de {formatDuration(draft.court.slotMinutes)} o
          múltiplos. Cuando confirmes el horario, la reservamos.
        </p>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          {draft.slots.map((slot, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3 rounded-sm border border-border-inset bg-inset p-3.5">
              <Field id={`date-${i}`} label="Fecha">
                <Input
                  id={`date-${i}`}
                  type="date"
                  min={today}
                  value={slot.date}
                  className="w-[170px]"
                  onChange={(e) => update({ slots: draft.slots.map((s, j) => (j === i ? { ...s, date: e.target.value } : s)) })}
                />
              </Field>
              <Field id={`time-${i}`} label="Hora">
                <Input
                  id={`time-${i}`}
                  type="time"
                  step={900}
                  value={slot.time}
                  className="w-[120px]"
                  onChange={(e) => update({ slots: draft.slots.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)) })}
                />
              </Field>
              <div className="flex flex-col gap-[5px]">
                <span className="text-xs text-text/70">Duración</span>
                <Segmented
                  name={`duration-${i}`}
                  label="Duración"
                  size="sm"
                  value={String(slot.durationMinutes)}
                  options={durationChoices.map((d) => ({ value: String(d), label: formatDuration(d) }))}
                  onChange={(v) => update({ slots: draft.slots.map((s, j) => (j === i ? { ...s, durationMinutes: Number(v) } : s)) })}
                />
              </div>
              {draft.slots.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label="Quitar este horario"
                  onClick={() => update({ slots: draft.slots.filter((_, j) => j !== i) })}
                >
                  <X />
                </Button>
              )}
              {draft.court && slot.date && <CourtBusyHint courtId={draft.court.id} slot={slot} />}
            </div>
          ))}
          {draft.slots.length < MAX_SLOTS && (
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => {
                const last = draft.slots[draft.slots.length - 1];
                update({ slots: [...draft.slots, { ...last, date: "" }] });
              }}
            >
              <Plus /> Agregar otro horario
            </Button>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <Field id="title" label="Título">
            <Input id="title" value={draft.title} maxLength={80} required onChange={(e) => update({ title: e.target.value })} />
          </Field>
          <Field id="description" label="Algo más (opcional)">
            <textarea
              id="description"
              value={draft.description}
              maxLength={1000}
              rows={3}
              placeholder="Vení con pechera clara. La cancha se paga en el momento."
              onChange={(e) => update({ description: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="capacity" label="Cupo (jugadores)">
              <Input id="capacity" type="number" min={2} max={30} value={draft.capacity} onChange={(e) => update({ capacity: e.target.value })} />
            </Field>
            <Field id="price" label="Precio por persona (opcional)" hint="Dejalo vacío si todavía no sabés.">
              <Input id="price" type="number" min={0} step={100} placeholder="$" value={draft.price} onChange={(e) => update({ price: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-text/70">Nivel</span>
            <Segmented name="level" label="Nivel" value={draft.level} options={LEVEL_OPTIONS} onChange={(level) => update({ level })} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-text/70">¿Quién lo ve?</span>
            <Segmented
              name="visibility"
              label="Visibilidad"
              value={draft.visibility}
              options={[
                { value: "public", label: "Público" },
                { value: "private", label: "Privado" },
              ]}
              onChange={(visibility) => update({ visibility })}
            />
            <span className="text-xs text-text-3">
              {draft.visibility === "public"
                ? "Aparece al explorar partidos y cualquiera se puede sumar."
                : "Solo entra quien tenga el link de invitación."}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => (setError(null), setStep(step - 1))}>
            Atrás
          </Button>
        )}
        <Button type="submit" className="ml-auto" disabled={pending} aria-busy={pending}>
          {step < STEPS.length - 1 ? "Seguir" : pending ? "Publicando…" : "Publicar partido"}
        </Button>
      </div>
    </form>
  );
}

function VenueStep({
  sportId,
  selected,
  onSelect,
}: {
  sportId: number | null;
  selected: VenueSummary | null;
  onSelect: (venue: VenueSummary) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<VenueSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchVenuesForMatchAction({ q, sportId: sportId ?? undefined });
      if (!cancelled) setResults(found);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, sportId]);

  const list = results ?? [];
  const withSelected = selected && !list.some((v) => v.id === selected.id) ? [selected, ...list] : list;

  return (
    <div className="flex flex-col gap-3">
      <Input value={q} placeholder="Nombre de la sede o dirección" aria-label="Buscar sede" onChange={(e) => setQ(e.target.value)} />
      {results === null ? (
        <div className="h-24 animate-pulse rounded-md bg-neutral-200" />
      ) : withSelected.length === 0 ? (
        <p className="m-0 text-sm text-text-2">No encontramos sedes con ese nombre para este deporte.</p>
      ) : (
        <ul className="m-0 flex max-h-[360px] list-none flex-col gap-2.5 overflow-y-auto p-0" role="radiogroup" aria-label="Sedes">
          {withSelected.map((venue) => (
            <li key={venue.id}>
              <button
                type="button"
                role="radio"
                aria-checked={venue.id === selected?.id}
                onClick={() => onSelect(venue)}
                className="block w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
              >
                <VenueCard venue={venue} active={venue.id === selected?.id} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <span className="text-[13px] text-text-3">
        ¿No está? <Link href="/sedes/nueva">Proponé la sede</Link> y volvé a armar el partido.
      </span>
    </div>
  );
}

// Canchas de la sede para el deporte elegido. Elegir una es opcional: sin cancha, el partido es "en la sede".
function CourtStep({
  venueId,
  sportId,
  selected,
  onSelect,
}: {
  venueId: string;
  sportId: number;
  selected: CourtOption | null;
  onSelect: (court: CourtOption | null) => void;
}) {
  const [loaded, setLoaded] = useState<{ key: string; courts: CourtOption[] } | null>(null);
  const key = `${venueId}:${sportId}`;

  useEffect(() => {
    let cancelled = false;
    listCourtsForMatchAction({ venueId, sportId }).then((courts) => {
      if (!cancelled) setLoaded({ key, courts });
    });
    return () => {
      cancelled = true;
    };
  }, [venueId, sportId, key]);

  if (!loaded || loaded.key !== key) return <div className="h-11 animate-pulse rounded-full bg-neutral-200" />;
  if (loaded.courts.length === 0) return null;

  const options = [{ id: null, label: "Sin cancha fija" }, ...loaded.courts.map((c) => ({ id: c.id, label: c.name }))];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-text/70">Cancha (opcional)</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cancha">
        {options.map((o) => {
          const on = (selected?.id ?? null) === o.id;
          return (
            <button
              key={o.id ?? "none"}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(o.id ? (loaded.courts.find((c) => c.id === o.id) ?? null) : null)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm transition-colors duration-150",
                on ? "bg-navy text-surface" : "tag-neutral hover:bg-neutral-300",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <span className="text-[13px] text-text-3">
        {selected
          ? `Turnos de ${formatDuration(selected.slotMinutes)} o múltiplos. Al confirmar el horario, la cancha queda reservada.`
          : "Si elegís una cancha, te mostramos qué horarios tiene ocupados y se reserva al confirmar."}
      </span>
    </div>
  );
}

// Franjas ocupadas de la cancha ese día, y aviso si el horario propuesto se superpone.
function CourtBusyHint({ courtId, slot }: { courtId: string; slot: SlotInput }) {
  const [loaded, setLoaded] = useState<{ key: string; busy: { start: string; end: string }[] } | null>(null);
  const key = `${courtId}:${slot.date}`;

  useEffect(() => {
    let cancelled = false;
    getCourtBusyAction({ courtId, date: slot.date }).then((busy) => {
      if (!cancelled) setLoaded({ key, busy });
    });
    return () => {
      cancelled = true;
    };
  }, [courtId, slot.date, key]);

  if (!loaded || loaded.key !== key) return null;
  const start = slot.time ? timeToMinutes(slot.time) : null;
  const end = start === null ? null : start + slot.durationMinutes;
  const clash =
    start !== null && end !== null && loaded.busy.some((b) => timeToMinutes(b.start) < end && timeToMinutes(b.end) > start);

  return (
    <span className={cn("basis-full text-xs", clash ? "font-semibold text-coral-700" : "text-text-3")} role={clash ? "alert" : undefined}>
      {clash
        ? "La cancha ya está ocupada en ese horario. "
        : loaded.busy.length === 0
          ? "La cancha está libre todo ese día."
          : ""}
      {loaded.busy.length > 0 && `Ocupada: ${loaded.busy.map((b) => `${b.start}–${b.end}`).join(" · ")}`}
    </span>
  );
}
