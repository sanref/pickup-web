"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Field, FormMessage } from "@/components/auth/auth-card";
import { SportTags, type SportOption } from "@/components/profile/sport-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaceSearch, type PickedPlace } from "@/components/venue/place-search";
import { VenueCard } from "@/components/venue/venue-card";
import { VenueMap } from "@/components/venue/venue-map";
import type { VenueSummary } from "@/server/services/venues";
import { createVenueAction, findSimilarVenuesAction } from "./actions";

type Step = { kind: "search" } | { kind: "similar"; place: PickedPlace; similar: VenueSummary[] } | { kind: "details"; place: PickedPlace };

export function NewVenueFlow({ sports }: { sports: SportOption[] }) {
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [sportIds, setSportIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(place: PickedPlace) {
    setError(null);
    setName(place.name);
    setCity(place.city);
    startTransition(async () => {
      const similar = await findSimilarVenuesAction({ name: place.name, location: place.location, googlePlaceId: place.googlePlaceId });
      setStep(similar.length ? { kind: "similar", place, similar } : { kind: "details", place });
    });
  }

  function toggleSport(id: number) {
    setSportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step.kind !== "details") return;
    startTransition(async () => {
      const result = await createVenueAction({
        name,
        city,
        address: step.place.address,
        location: step.place.location,
        googlePlaceId: step.place.googlePlaceId,
        sportIds: [...sportIds],
      });
      if (result?.error) setError(result.error);
    });
  }

  const place = step.kind === "search" ? null : step.place;

  return (
    <div className="grid items-start gap-8 min-[900px]:grid-cols-[1fr_440px]">
      <div className="flex flex-col gap-5">
        {step.kind === "search" && (
          <>
            <PlaceSearch onPick={onPick} />
            {pending && <span className="text-sm text-text-3">Revisando si ya la tenemos…</span>}
          </>
        )}

        {step.kind === "similar" && (
          <>
            <FormMessage kind="notice">
              Encontramos {step.similar.length === 1 ? "una sede parecida" : "sedes parecidas"} cerca. Si es alguna de estas, usala
              para no duplicarla.
            </FormMessage>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {step.similar.map((v) => (
                <li key={v.id}>
                  <Link href={`/sedes/${v.id}`} className="block text-text no-underline">
                    <VenueCard venue={v} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2.5">
              <Button type="button" variant="ghost" onClick={() => setStep({ kind: "search" })}>
                Buscar otra
              </Button>
              <Button type="button" variant="outline" className="ml-auto" onClick={() => setStep({ kind: "details", place: step.place })}>
                No, es otra sede
              </Button>
            </div>
          </>
        )}

        {step.kind === "details" && (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FormMessage kind="error">{error}</FormMessage>
            <Field id="name" label="Nombre">
              <Input id="name" value={name} maxLength={120} required onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field id="address" label="Dirección">
                <Input id="address" value={step.place.address} readOnly />
              </Field>
              <Field id="city" label="Ciudad">
                <Input id="city" value={city} maxLength={80} required onChange={(e) => setCity(e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs text-text/70">¿Qué se juega?</span>
              <SportTags sports={sports} selected={sportIds} onToggle={toggleSport} />
            </div>
            <p className="m-0 text-xs text-text-3">
              La revisamos antes de sumarla al catálogo. Mientras tanto ya podés armar partidos acá.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button type="button" variant="ghost" onClick={() => setStep({ kind: "search" })} disabled={pending}>
                Buscar otra
              </Button>
              <Button type="submit" className="ml-auto" disabled={pending || sportIds.size === 0} aria-busy={pending}>
                {pending ? "Guardando…" : "Proponer sede"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <VenueMap
        pins={place ? [{ id: "nueva", lat: place.location.lat, lng: place.location.lng, label: name || place.name }] : []}
        activeId="nueva"
        className="h-[280px] min-[900px]:h-[440px]"
      />
    </div>
  );
}
