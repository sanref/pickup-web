"use client";

import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { SKILL_LEVEL_LABELS, SKILL_LEVELS, type SkillLevel } from "@/lib/validations/profile";

export type SportOption = { id: number; name: string };
export type SportSelection = { sportId: number; level: SkillLevel };

const LEVEL_OPTIONS_LONG = SKILL_LEVELS.map((value) => ({ value, label: SKILL_LEVEL_LABELS[value].long }));
const LEVEL_OPTIONS_SHORT = SKILL_LEVELS.map((value) => ({ value, label: SKILL_LEVEL_LABELS[value].short }));

// Tags multi-selección (navy = elegido) y, por cada deporte elegido, su nivel autodeclarado.
export function SportPicker({
  sports,
  value,
  onChange,
  compactLevels = false,
}: {
  sports: SportOption[];
  value: SportSelection[];
  onChange: (value: SportSelection[]) => void;
  compactLevels?: boolean;
}) {
  const selected = new Map(value.map((s) => [s.sportId, s.level]));

  function toggle(sportId: number) {
    onChange(
      selected.has(sportId)
        ? value.filter((s) => s.sportId !== sportId)
        : [...value, { sportId, level: "intermediate" }],
    );
  }

  function setLevel(sportId: number, level: SkillLevel) {
    onChange(value.map((s) => (s.sportId === sportId ? { ...s, level } : s)));
  }

  const chosen = sports.filter((s) => selected.has(s.id));

  return (
    <div className="flex flex-col gap-5">
      <SportTags sports={sports} selected={selected} onToggle={toggle} />

      {chosen.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {chosen.map((sport) => (
            <div
              key={sport.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-surface px-4 py-3"
            >
              <span className="text-sm font-semibold">
                {compactLevels ? sport.name : `Tu nivel en ${sport.name.toLowerCase()}`}
              </span>
              <Segmented
                name={`nivel-${sport.id}`}
                label={`Nivel en ${sport.name}`}
                value={selected.get(sport.id) ?? null}
                options={compactLevels ? LEVEL_OPTIONS_SHORT : LEVEL_OPTIONS_LONG}
                onChange={(level) => setLevel(sport.id, level)}
                size={compactLevels ? "sm" : "md"}
              />
            </div>
          ))}
          <span className="text-xs text-text-3">
            Lo declarás vos. Sirve para que los partidos queden parejos, no es un ranking.
          </span>
        </div>
      )}
    </div>
  );
}

// Tags multi-selección: navy = elegido.
export function SportTags({
  sports,
  selected,
  onToggle,
}: {
  sports: SportOption[];
  selected: { has(id: number): boolean };
  onToggle: (sportId: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Deportes">
      {sports.map((sport) => {
        const on = selected.has(sport.id);
        return (
          <button
            key={sport.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(sport.id)}
            className={cn(
              "min-h-11 rounded-full px-3.5 text-[13px] transition-colors duration-150 ease-out sm:min-h-9",
              on ? "bg-navy font-semibold text-surface" : "bg-neutral-200 text-text-2 hover:bg-neutral-300",
            )}
          >
            {sport.name}
            {on && " ✓"}
          </button>
        );
      })}
    </div>
  );
}
