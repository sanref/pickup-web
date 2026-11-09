"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, FormMessage } from "@/components/auth/auth-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDuration, SLOT_MINUTES_OPTIONS } from "@/lib/validations/venue-admin";
import type { Court } from "@/server/services/venue-admin";
import { createCourtAction, deleteCourtAction, updateCourtAction } from "../../actions";

type SportOption = { id: number; name: string };
type Draft = { name: string; sportId: string; slotMinutes: string; isActive: boolean };

export function CourtsManager({ venueId, courts, sports }: { venueId: string; courts: Court[]; sports: SportOption[] }) {
  const [editing, setEditing] = useState<Court | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(court: Court) {
    if (!window.confirm(`¿Borrar ${court.name}?`)) return;
    startTransition(async () => {
      const result = await deleteCourtAction(venueId, court.id);
      if (result.ok) toast.success("Borramos la cancha.");
      else toast.error(result.error);
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[21px] tracking-[-0.02em]">Canchas</h2>
          <p className="m-0 text-sm text-text-2">Cada cancha tiene una actividad y un turno mínimo: los turnos duran ese tiempo o un múltiplo.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Nueva cancha
        </Button>
      </div>

      {courts.length === 0 ? (
        <div className="rounded-md border border-dashed border-edge bg-surface p-6 text-sm text-text-2">
          Todavía no cargaste canchas. Creá la primera para empezar a dar turnos.
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {courts.map((court) => (
            <li key={court.id} className="flex flex-wrap items-center gap-3 rounded-md border border-edge bg-surface px-4 py-3 shadow-xs">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{court.name}</span>
                  <Badge variant="neutral">{court.sportName}</Badge>
                  {!court.isActive && <Badge variant="outline">Desactivada</Badge>}
                </div>
                <span className="text-xs text-text-3">Turno mínimo: {formatDuration(court.slotMinutes)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(court)}>
                  Editar
                </Button>
                {!court.inUse && (
                  <Button variant="destructive" size="sm" disabled={pending} onClick={() => remove(court)}>
                    Borrar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing !== null && (
            <CourtForm
              key={editing === "new" ? "new" : editing.id}
              venueId={venueId}
              court={editing === "new" ? null : editing}
              sports={sports}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function CourtForm({
  venueId,
  court,
  sports,
  onDone,
}: {
  venueId: string;
  court: Court | null;
  sports: SportOption[];
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: court?.name ?? "",
    sportId: court ? String(court.sportId) : "",
    slotMinutes: String(court?.slotMinutes ?? 60),
    isActive: court?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const slotOptions: number[] = [...SLOT_MINUTES_OPTIONS];
  if (court && !slotOptions.includes(court.slotMinutes)) slotOptions.push(court.slotMinutes);
  slotOptions.sort((a, b) => a - b);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return setError("Poné un nombre.");
    if (!draft.sportId) return setError("Elegí la actividad.");
    const input = { name: draft.name, sportId: Number(draft.sportId), slotMinutes: Number(draft.slotMinutes), isActive: draft.isActive };
    startTransition(async () => {
      const result = court ? await updateCourtAction(venueId, court.id, input) : await createCourtAction(venueId, input);
      if (!result.ok) return setError(result.error);
      toast.success(court ? "Guardamos la cancha." : "Creamos la cancha.");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{court ? `Editar ${court.name}` : "Nueva cancha"}</DialogTitle>
        <DialogDescription>El turno mínimo define cuánto dura como mínimo cada turno en el calendario.</DialogDescription>
      </DialogHeader>
      <FormMessage kind="error">{error}</FormMessage>
      <Field id="court-name" label="Nombre">
        <Input
          id="court-name"
          value={draft.name}
          maxLength={60}
          placeholder="Cancha 1"
          required
          autoFocus
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </Field>
      <Field id="court-sport" label="Actividad">
        <NativeSelect id="court-sport" value={draft.sportId} required onChange={(e) => setDraft({ ...draft, sportId: e.target.value })}>
          <option value="" disabled>
            Elegí la actividad
          </option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="court-slot" label="Turno mínimo" hint="Por ejemplo, 1 h en fútbol o 1 h 30 en pádel.">
        <NativeSelect id="court-slot" value={draft.slotMinutes} onChange={(e) => setDraft({ ...draft, slotMinutes: e.target.value })}>
          {slotOptions.map((m) => (
            <option key={m} value={m}>
              {formatDuration(m)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
          className="size-4 accent-coral"
        />
        Activa: se puede reservar y elegir al armar un partido
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
