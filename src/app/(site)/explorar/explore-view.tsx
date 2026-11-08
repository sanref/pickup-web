"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { missingText } from "@/components/match/match-bits";
import { MatchCard, nextSlotLabel } from "@/components/match/match-card";
import { MatchMap, type MatchPin } from "@/components/match/match-map";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { DEFAULT_CENTER, DEFAULT_ZONE_LABEL } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { RADIUS_KM, SORT_OPTIONS, exploreHref, type ExploreFilters, type Sort } from "@/lib/validations/search";
import type { MatchSearchResult } from "@/server/services/search";
import { ExploreFiltersPanel, isFiltered, type SportOption } from "./explore-filters";

const VIEWS = [
  { value: "lista", label: "Lista" },
  { value: "mapa", label: "Mapa" },
] as const;

// Nombre de la zona para los textos: "a menos de 10 km de Rosario centro".
function zoneText(f: ExploreFilters): string {
  return f.zone ?? (f.center ? "la zona del mapa" : DEFAULT_ZONE_LABEL);
}

// Lista + mapa + filtros. Los filtros viven en la URL: cada cambio navega (con "atrás" funcionando) y el
// servidor vuelve a buscar. Mientras llega la respuesta, los controles ya muestran el valor nuevo.
export function ExploreView({
  filters,
  sports,
  matches,
  total,
}: {
  filters: ExploreFilters;
  sports: SportOption[];
  matches: MatchSearchResult[];
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, applyPatch] = useOptimistic(filters, (state: ExploreFilters, patch: Partial<ExploreFilters>) => ({ ...state, ...patch }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cards = useRef(new Map<string, HTMLElement>());

  const update = useCallback(
    (patch: Partial<ExploreFilters>, history: "push" | "replace" = "push") => {
      const href = exploreHref({ ...current, ...patch });
      startTransition(() => {
        applyPatch(patch);
        if (history === "push") router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      });
    },
    [current, applyPatch, router],
  );

  // Arrastrar el mapa busca alrededor del nuevo centro sin llenar el historial.
  const onCenterChange = useCallback((center: { lat: number; lng: number }) => update({ center, zone: null }, "replace"), [update]);

  const onPinClick = useCallback(
    (group: MatchPin[]) => {
      if (group.length === 1) return router.push(`/partidos/${group[0].id}`);
      // Varios partidos en la misma sede: se muestran en la lista.
      setActiveId(group[0].id);
      setView("lista");
      requestAnimationFrame(() => cards.current.get(group[0].id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    },
    [router],
  );

  const pins = useMemo<MatchPin[]>(
    () =>
      matches.map((m) => ({
        id: m.id,
        venueId: m.venue.id,
        lat: m.venue.location.lat,
        lng: m.venue.location.lng,
        label: nextSlotLabel(m),
        activeLabel: `${nextSlotLabel(m)} · ${missingText(m.missing)}`,
      })),
    [matches],
  );

  const zone = zoneText(current);
  const widerKm = Math.min(RADIUS_KM.max, Math.max(current.km * 2, 25));
  const activeFilters = [current.sport, current.km !== RADIUS_KM.default, current.when !== "todas", current.level].filter(Boolean).length;
  const filtersPanel = <ExploreFiltersPanel filters={current} sports={sports} zone={zone} onChange={(patch) => update(patch)} />;

  return (
    // Desde 900px la pantalla se parte en dos: a la izquierda filtros + lista (con su propio scroll) y a la
    // derecha el mapa, que ocupa todo el alto y el ancho que quedan. Debajo de 900px lista y mapa se alternan.
    <div className="flex w-full flex-1 flex-col min-[900px]:h-[calc(100dvh-var(--site-header-h))] min-[900px]:flex-row min-[900px]:overflow-hidden">
      <div
        className={cn(
          "min-w-0 gap-[26px] px-4 pt-4 pb-11 min-[900px]:w-[520px] min-[900px]:shrink-0 min-[900px]:overflow-y-auto min-[900px]:px-8 min-[900px]:pt-[26px] min-[1200px]:w-[800px]",
          view === "mapa" ? "hidden min-[900px]:flex" : "flex",
        )}
      >
        <aside aria-label="Filtros" className="sticky top-0 hidden w-[230px] shrink-0 self-start pt-4 min-[1200px]:block">
          {filtersPanel}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-col">
              <h1 className="m-0 text-[26px] leading-tight tracking-[-0.02em]">
                {total} {total === 1 ? "partido con lugar" : "partidos con lugar"}
              </h1>
              <span className="text-[13px] text-text-3">
                A menos de {current.km} km de {zone}
              </span>
            </div>
            <label className="ml-auto flex items-center gap-1 text-[13px] text-text-3">
              Ordenar por:
              <select
                value={current.sort}
                onChange={(e) => update({ sort: e.target.value as Sort }, "replace")}
                className="cursor-pointer rounded-full bg-transparent py-1 font-semibold text-text"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <MobileBar activeFilters={activeFilters} view={view} onView={setView} onOpenFilters={() => setFiltersOpen(true)} />

          {matches.length > 0 ? (
            <ul aria-busy={pending} className={cn("m-0 flex list-none flex-col gap-3.5 p-0 transition-opacity duration-150", pending && "opacity-60")}>
              {matches.map((m) => (
                <li
                  key={m.id}
                  ref={(el) => {
                    if (el) cards.current.set(m.id, el);
                    else cards.current.delete(m.id);
                  }}
                  onMouseEnter={() => setActiveId(m.id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  <Link href={`/partidos/${m.id}`} onFocus={() => setActiveId(m.id)} className="block rounded-md text-text no-underline">
                    <MatchCard match={m} active={m.id === activeId} />
                  </Link>
                </li>
              ))}
              {total > matches.length && (
                <li className="px-1 text-[13px] text-text-3">
                  Mostramos los {matches.length} {current.sort === "pronto" ? "más próximos" : "más cercanos"}. Filtrá por deporte o fecha para ver otros.
                </li>
              )}
            </ul>
          ) : (
            <div aria-busy={pending} className={cn("flex flex-col items-start gap-3 rounded-lg border border-edge bg-surface p-8 shadow-sm", pending && "opacity-60")}>
              <span className="text-2xl font-bold tracking-[-0.02em]">No hay partidos con lugar por acá</span>
              <span className="text-sm text-text-2">
                {current.km < RADIUS_KM.max ? "Probá ampliar la distancia o cambiar los filtros. " : "Probá cambiar los filtros. "}
                O armá uno: con dos o tres horarios posibles se completa rápido.
              </span>
              <div className="flex flex-wrap gap-2.5">
                {current.km < RADIUS_KM.max && (
                  <Button variant="outline" onClick={() => update({ km: widerKm })}>
                    Ampliar a {widerKm} km
                  </Button>
                )}
                {isFiltered(current) && (
                  <Button variant="outline" onClick={() => update({ sport: null, when: "todas", level: null })}>
                    Quitar filtros
                  </Button>
                )}
                <Button asChild>
                  <Link href="/partidos/nuevo">Crear partido</Link>
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className={cn("relative min-w-0 flex-col gap-3 px-4 pt-4 min-[900px]:flex-1 min-[900px]:p-0", view === "lista" ? "hidden min-[900px]:flex" : "flex")}>
        <div className="min-[900px]:hidden">
          <MobileBar activeFilters={activeFilters} view={view} onView={setView} onOpenFilters={() => setFiltersOpen(true)} />
        </div>
        <MatchMap
          center={current.center ?? DEFAULT_CENTER}
          radiusKm={current.km}
          pins={pins}
          activeId={activeId}
          onPinClick={onPinClick}
          onCenterChange={onCenterChange}
          className="h-[calc(100dvh-200px)] min-h-[360px] min-[900px]:h-auto min-[900px]:flex-1 min-[900px]:rounded-none min-[900px]:border-0 min-[900px]:border-l min-[900px]:shadow-none"
        />
        <span className="pointer-events-none absolute bottom-4 left-1/2 hidden w-fit -translate-x-1/2 rounded-full bg-navy px-3 py-1.5 text-xs text-navy-200 shadow-md min-[900px]:block">
          Moviendo el mapa se actualiza la lista
        </span>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          {filtersPanel}
          <DialogFooter>
            <Button onClick={() => setFiltersOpen(false)}>{pending ? "Buscando…" : `Ver ${total === 1 ? "1 partido" : `${total} partidos`}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Debajo de 1200px los filtros van en un panel; debajo de 900px, además, lista y mapa se alternan.
function MobileBar({
  activeFilters,
  view,
  onView,
  onOpenFilters,
}: {
  activeFilters: number;
  view: "lista" | "mapa";
  onView: (view: "lista" | "mapa") => void;
  onOpenFilters: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 min-[1200px]:hidden">
      <Button variant="outline" onClick={onOpenFilters}>
        <SlidersHorizontal aria-hidden />
        Filtros{activeFilters > 0 && ` · ${activeFilters}`}
      </Button>
      <div className="ml-auto min-[900px]:hidden">
        <Segmented name="vista" label="Ver como" value={view} options={VIEWS} onChange={onView} />
      </div>
    </div>
  );
}
