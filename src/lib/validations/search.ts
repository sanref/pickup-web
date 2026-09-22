import { SKILL_LEVELS, type SkillLevel } from "./profile";

// Filtros de /explorar. Viven en la URL (?deporte=&km=&cuando=&nivel=&orden=&lat=&lng=&zona=)
// para que el link se pueda compartir y el botón de atrás funcione. Los valores por defecto no se escriben.

export const RADIUS_KM = { min: 1, max: 50, default: 10 } as const;

export const WHEN_OPTIONS = [
  { value: "semana", label: "Esta semana" },
  { value: "finde", label: "Fin de semana" },
  { value: "todas", label: "Cualquier fecha" },
] as const;
export type When = (typeof WHEN_OPTIONS)[number]["value"];

export const SORT_OPTIONS = [
  { value: "cerca", label: "más cercano" },
  { value: "pronto", label: "más pronto" },
] as const;
export type Sort = (typeof SORT_OPTIONS)[number]["value"];

// En la URL el nivel va en castellano.
const LEVEL_SLUGS: Record<SkillLevel, string> = { beginner: "principiante", intermediate: "intermedio", advanced: "avanzado" };

export type ExploreFilters = {
  sport: string | null;
  km: number;
  when: When;
  level: SkillLevel | null;
  sort: Sort;
  /** Null = centro por defecto (ciudad piloto). */
  center: { lat: number; lng: number } | null;
  /** Nombre de la zona elegida, solo para mostrar. */
  zone: string | null;
};

export const DEFAULT_FILTERS: ExploreFilters = {
  sport: null,
  km: RADIUS_KM.default,
  when: "todas",
  level: null,
  sort: "cerca",
  center: null,
  zone: null,
};

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

function coordinate(value: string | undefined, limit: number): number | null {
  if (!value || !/^-?\d{1,3}(\.\d{1,6})?$/.test(value)) return null;
  const n = Number(value);
  return Math.abs(n) <= limit ? n : null;
}

export function parseExploreParams(params: Params): ExploreFilters {
  const sport = one(params, "deporte");
  const km = Number(one(params, "km"));
  const when = WHEN_OPTIONS.find((o) => o.value === one(params, "cuando"))?.value;
  const level = SKILL_LEVELS.find((l) => LEVEL_SLUGS[l] === one(params, "nivel"));
  const sort = SORT_OPTIONS.find((o) => o.value === one(params, "orden"))?.value;
  const lat = coordinate(one(params, "lat"), 90);
  const lng = coordinate(one(params, "lng"), 180);
  const center = lat != null && lng != null ? { lat, lng } : null;
  return {
    sport: sport && /^[a-z0-9-]{1,40}$/.test(sport) ? sport : null,
    km: Number.isInteger(km) && km >= RADIUS_KM.min && km <= RADIUS_KM.max ? km : RADIUS_KM.default,
    when: when ?? DEFAULT_FILTERS.when,
    level: level ?? null,
    sort: sort ?? DEFAULT_FILTERS.sort,
    center,
    zone: center ? (one(params, "zona")?.trim().slice(0, 60) || null) : null,
  };
}

export function exploreHref(filters: ExploreFilters): string {
  const p = new URLSearchParams();
  if (filters.sport) p.set("deporte", filters.sport);
  if (filters.km !== RADIUS_KM.default) p.set("km", String(filters.km));
  if (filters.when !== DEFAULT_FILTERS.when) p.set("cuando", filters.when);
  if (filters.level) p.set("nivel", LEVEL_SLUGS[filters.level]);
  if (filters.sort !== DEFAULT_FILTERS.sort) p.set("orden", filters.sort);
  if (filters.center) {
    p.set("lat", filters.center.lat.toFixed(4));
    p.set("lng", filters.center.lng.toFixed(4));
    if (filters.zone) p.set("zona", filters.zone);
  }
  const query = p.toString();
  return query ? `/explorar?${query}` : "/explorar";
}
