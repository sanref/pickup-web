"use client";

import { useState, useTransition } from "react";
import { Field, FormMessage } from "@/components/auth/auth-card";
import { SportPicker, type SportOption, type SportSelection } from "@/components/profile/sport-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "./actions";

type Initial = { displayName: string; city: string; bio: string; sports: SportSelection[] };

const STEPS = [
  { title: "¿Cómo te llamamos?", description: "Es el nombre que ven los demás en los partidos." },
  { title: "¿A qué jugás?", description: "Con esto te mostramos primero los partidos que te sirven. Lo podés cambiar después." },
  { title: "¿Dónde jugás?", description: "Usamos tu ciudad como punto de partida para buscar partidos cerca." },
] as const;

export function OnboardingWizard({ sports, initial, next }: { sports: SportOption[]; initial: Initial; next: string }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function validate(): string | null {
    if (step === 0 && !data.displayName.trim()) return "Poné cómo querés que te llamen.";
    if (step === 1 && data.sports.length === 0) return "Elegí al menos un deporte.";
    if (step === 2 && data.city.trim().length < 2) return "Poné tu ciudad.";
    return null;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    startTransition(async () => {
      const result = await completeOnboardingAction(data, next);
      if (result?.error) setError(result.error);
    });
  }

  const current = STEPS[step];

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-[620px] flex-col gap-5 rounded-lg bg-background px-6 py-8 shadow-lg sm:p-[34px]"
    >
      <div className="flex gap-1.5" aria-label={`Paso ${step + 1} de ${STEPS.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        {STEPS.map((s, i) => (
          <div key={s.title} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-150", i <= step ? "bg-accent" : "bg-neutral-300")} />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-heading text-[30px] leading-tight">{current.title}</h1>
        <p className="m-0 text-sm text-neutral-800">{current.description}</p>
      </div>

      <FormMessage kind="error">{error}</FormMessage>

      {step === 0 && (
        <Field id="displayName" label="Nombre visible">
          <Input
            id="displayName"
            value={data.displayName}
            maxLength={60}
            autoFocus
            onChange={(e) => setData({ ...data, displayName: e.target.value })}
          />
        </Field>
      )}

      {step === 1 && (
        <SportPicker sports={sports} value={data.sports} onChange={(value) => setData({ ...data, sports: value })} />
      )}

      {step === 2 && (
        <>
          <Field id="city" label="Ciudad">
            <Input
              id="city"
              value={data.city}
              placeholder="Rosario, Santa Fe"
              maxLength={80}
              autoFocus
              onChange={(e) => setData({ ...data, city: e.target.value })}
            />
          </Field>
          <Field id="bio" label="Una línea sobre vos (opcional)">
            <Input
              id="bio"
              value={data.bio}
              placeholder="Arquero. Juego los jueves hace diez años."
              maxLength={280}
              onChange={(e) => setData({ ...data, bio: e.target.value })}
            />
          </Field>
        </>
      )}

      <div className="flex items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="ghost" onClick={() => (setError(null), setStep(step - 1))} disabled={pending}>
            Atrás
          </Button>
        )}
        <Button type="submit" className="ml-auto" disabled={pending} aria-busy={pending}>
          {step < STEPS.length - 1 ? "Seguir" : pending ? "Guardando…" : "Empezar a jugar"}
        </Button>
      </div>
    </form>
  );
}
