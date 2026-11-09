"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, FormMessage } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateVenueDataAction } from "../../actions";

type Values = { name: string; phone: string; sportIds: number[] };

export function VenueDataForm({
  venueId,
  sports,
  initial,
  address,
}: {
  venueId: string;
  sports: { id: number; name: string }[];
  initial: Values;
  address: string;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleSport(id: number) {
    const on = values.sportIds.includes(id);
    setValues({ ...values, sportIds: on ? values.sportIds.filter((s) => s !== id) : [...values.sportIds, id] });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (values.sportIds.length === 0) return setError("Elegí al menos un deporte.");
    setError(null);
    startTransition(async () => {
      const result = await updateVenueDataAction(venueId, values);
      if (result.ok) toast.success("Guardamos los datos de la sede.");
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="m-0 text-[21px] tracking-[-0.02em]">Datos de la sede</h2>
      <FormMessage kind="error">{error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="venue-name" label="Nombre">
          <Input
            id="venue-name"
            value={values.name}
            minLength={2}
            maxLength={120}
            required
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
        </Field>
        <Field id="venue-phone" label="Teléfono (opcional)">
          <Input
            id="venue-phone"
            type="tel"
            value={values.phone}
            maxLength={40}
            placeholder="341 555-0000"
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
          />
        </Field>
      </div>
      <Field id="venue-address" label="Dirección" hint="La ubicación sale del mapa. Si está mal, escribinos y la corregimos.">
        <Input id="venue-address" value={address} disabled readOnly />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-text-3">Deportes que se juegan</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Deportes">
          {sports.map((s) => {
            const on = values.sportIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSport(s.id)}
                className={cn(
                  "min-h-11 rounded-full px-4 text-sm transition-colors duration-150",
                  on ? "bg-navy text-surface" : "tag-neutral hover:bg-neutral-300",
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex">
        <Button type="submit" className="ml-auto" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
