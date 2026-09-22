"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { ZonePicker } from "@/components/venue/zone-picker";
import { cn } from "@/lib/utils";
import { SKILL_LEVEL_LABELS, SKILL_LEVELS } from "@/lib/validations/profile";
import { DEFAULT_FILTERS, RADIUS_KM, WHEN_OPTIONS, type ExploreFilters } from "@/lib/validations/search";

export type SportOption = { id: number; slug: string; name: string };

export function isFiltered(f: ExploreFilters): boolean {
  return f.sport !== DEFAULT_FILTERS.sport || f.km !== DEFAULT_FILTERS.km || f.when !== DEFAULT_FILTERS.when || f.level !== DEFAULT_FILTERS.level;
}

// Tags seleccionables: el deporte activo en terracota (handoff), el nivel activo en salvia.
function FilterTag({ on, tone, onClick, children }: { on: boolean; tone: "accent" | "accent-2"; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center rounded-full px-3.5 text-[13px] transition-colors duration-150 ease-out sm:min-h-9",
        on
          ? tone === "accent"
            ? "bg-accent-100 text-accent-800"
            : "bg-accent-2-100 text-accent-2-800"
          : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200",
      )}
    >
      {children}
    </button>
  );
}

function Block({ label, htmlFor, aside, children }: { label: string; htmlFor?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-[11px] tracking-[0.08em] text-neutral-700 uppercase">
          {label}
        </Label>
        {aside}
      </div>
      {children}
    </div>
  );
}

// El slider muestra el valor mientras se arrastra y busca recién al soltarlo.
function DistanceSlider({ km, onCommit }: { km: number; onCommit: (km: number) => void }) {
  const [value, setValue] = useState(km);
  return (
    <Block label="Distancia" aside={<span className="text-[13px] font-semibold whitespace-nowrap">{value} km</span>}>
      <Slider
        min={RADIUS_KM.min}
        max={RADIUS_KM.max}
        step={1}
        value={[value]}
        onValueChange={([v]) => setValue(v)}
        onValueCommit={([v]) => onCommit(v)}
        aria-label="Distancia máxima en kilómetros"
        className="py-2"
      />
    </Block>
  );
}

export function ExploreFiltersPanel({
  filters,
  sports,
  zone,
  onChange,
}: {
  filters: ExploreFilters;
  sports: SportOption[];
  zone: string;
  onChange: (patch: Partial<ExploreFilters>) => void;
}) {
  const zoneId = useId();
  return (
    <div className="flex flex-col gap-5">
      <Block label="Zona" htmlFor={zoneId}>
        <ZonePicker id={zoneId} current={zone} onPick={(z) => onChange({ center: { lat: z.lat, lng: z.lng }, zone: z.label })} />
      </Block>

      <Block label="Deporte">
        <div className="flex flex-wrap gap-1.5">
          {sports.map((s) => (
            <FilterTag key={s.slug} tone="accent" on={filters.sport === s.slug} onClick={() => onChange({ sport: filters.sport === s.slug ? null : s.slug })}>
              {s.name}
            </FilterTag>
          ))}
        </div>
      </Block>

      <DistanceSlider key={filters.km} km={filters.km} onCommit={(km) => onChange({ km })} />

      <Block label="Cuándo">
        <Segmented name="cuando" label="Cuándo" orientation="vertical" value={filters.when} options={WHEN_OPTIONS} onChange={(when) => onChange({ when })} />
      </Block>

      <Block label="Nivel">
        <div className="flex flex-wrap gap-1.5">
          {SKILL_LEVELS.map((level) => (
            <FilterTag key={level} tone="accent-2" on={filters.level === level} onClick={() => onChange({ level: filters.level === level ? null : level })}>
              {SKILL_LEVEL_LABELS[level].long}
            </FilterTag>
          ))}
        </div>
        <span className="text-xs text-neutral-700">Los partidos sin nivel aparecen siempre.</span>
      </Block>

      <Button
        variant="ghost"
        className="self-start"
        disabled={!isFiltered(filters)}
        onClick={() => onChange({ sport: null, km: DEFAULT_FILTERS.km, when: DEFAULT_FILTERS.when, level: null })}
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
