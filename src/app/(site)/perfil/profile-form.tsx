"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/auth/auth-card";
import { SportPicker, type SportOption, type SportSelection } from "@/components/profile/sport-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "./actions";

type Values = { displayName: string; city: string; bio: string; sports: SportSelection[] };

export function ProfileForm({ sports, initial }: { sports: SportOption[]; initial: Values }) {
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.ok) toast.success("Guardamos los cambios.");
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="m-0 text-[21px] tracking-[-0.02em]">Datos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="displayName" label="Nombre visible">
            <Input
              id="displayName"
              value={values.displayName}
              maxLength={60}
              required
              onChange={(e) => setValues({ ...values, displayName: e.target.value })}
            />
          </Field>
          <Field id="city" label="Ciudad">
            <Input
              id="city"
              value={values.city}
              maxLength={80}
              required
              onChange={(e) => setValues({ ...values, city: e.target.value })}
            />
          </Field>
        </div>
        <Field id="bio" label="Una línea sobre vos">
          <Input id="bio" value={values.bio} maxLength={280} onChange={(e) => setValues({ ...values, bio: e.target.value })} />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="m-0 text-[21px] tracking-[-0.02em]">Deportes y nivel</h2>
        <SportPicker sports={sports} value={values.sports} onChange={(s) => setValues({ ...values, sports: s })} compactLevels />
      </section>

      <div className="flex">
        <Button type="submit" className="ml-auto" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
