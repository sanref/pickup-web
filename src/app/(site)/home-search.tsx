"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { ZonePicker, type Zone } from "@/components/venue/zone-picker";
import { DEFAULT_ZONE_LABEL } from "@/lib/geo";
import { DEFAULT_FILTERS, WHEN_OPTIONS, exploreHref, type When } from "@/lib/validations/search";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <label htmlFor={htmlFor} className="text-[11px] text-text-3">
        {label}
      </label>
      {children}
    </div>
  );
}

const Divider = () => <span aria-hidden className="hidden h-8 w-px shrink-0 bg-border min-[640px]:block" />;

const selectClass = "w-full cursor-pointer appearance-none bg-transparent text-[15px] font-semibold text-text";

// Buscador del hero (Deporte / Zona / Cuándo): lleva a /explorar con esos filtros.
export function HomeSearch({ sports }: { sports: { slug: string; name: string }[] }) {
  const router = useRouter();
  const ids = { sport: useId(), zone: useId(), when: useId() };
  const [sport, setSport] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [when, setWhen] = useState<When>("semana");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      exploreHref({
        ...DEFAULT_FILTERS,
        sport: sport || null,
        when,
        center: zone ? { lat: zone.lat, lng: zone.lng } : null,
        zone: zone?.label ?? null,
      }),
    );
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="flex max-w-[560px] flex-col gap-3 rounded-md border border-edge bg-surface p-4 shadow-md min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-2.5 min-[640px]:rounded-full min-[640px]:py-2 min-[640px]:pr-2 min-[640px]:pl-[22px]"
    >
      <Field label="Deporte" htmlFor={ids.sport}>
        <select id={ids.sport} value={sport} onChange={(e) => setSport(e.target.value)} className={selectClass}>
          <option value="">Todos</option>
          {sports.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Divider />
      <Field label="Zona" htmlFor={ids.zone}>
        <ZonePicker id={ids.zone} variant="bare" current={zone?.label ?? DEFAULT_ZONE_LABEL} onPick={setZone} />
      </Field>
      <Divider />
      <Field label="Cuándo" htmlFor={ids.when}>
        <select id={ids.when} value={when} onChange={(e) => setWhen(e.target.value as When)} className={selectClass}>
          {WHEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" size="icon" aria-label="Buscar" className="shrink-0 min-[640px]:ml-auto">
        <ArrowRight />
      </Button>
    </form>
  );
}
