import Link from "next/link";
import { CapacityBar, MissingCount } from "@/components/match/match-bits";
import { MatchTile, SportMonogram } from "@/components/match/match-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime, formatWeekday } from "@/lib/dates";
import { DEFAULT_CENTER } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, exploreHref } from "@/lib/validations/search";
import { getActor } from "@/server/auth/session";
import { listActiveSports } from "@/server/services/profiles";
import { searchMatches, type MatchSearchResult } from "@/server/services/search";
import { HomeSearch } from "./home-search";

const STEPS = [
  {
    title: "Proponé horarios",
    body: "Elegís la sede y dos o tres fechas posibles. No hace falta que estén todos.",
  },
  {
    title: "Cada uno marca lo que le sirve",
    body: "Una grilla simple muestra quién puede y cuándo. Se actualiza en vivo.",
  },
  {
    title: "Se confirma y se juega",
    body: "Cuando una opción llega al cupo, avisamos a todos con la cancha y el horario.",
  },
];

const tagLink =
  "inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] no-underline transition-colors duration-150 ease-out sm:min-h-9";

// Cancha dibujada en lugar de la foto del handoff (el bundle no trae imágenes): franjas de césped
// en salvia y líneas del color del fondo.
function Pitch() {
  return (
    <div
      aria-hidden
      className="relative h-[300px] overflow-hidden rounded-lg"
      style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--color-accent-2-200) 0 44px, var(--color-accent-2-300) 44px 88px)" }}
    >
      <svg viewBox="0 0 560 300" className="absolute inset-0 size-full" fill="none" stroke="var(--background)" strokeWidth="3" opacity="0.85">
        <rect x="28" y="28" width="504" height="244" rx="8" />
        <line x1="280" y1="28" x2="280" y2="272" />
        <circle cx="280" cy="150" r="42" />
        <circle cx="280" cy="150" r="3" fill="var(--background)" />
        <rect x="28" y="92" width="60" height="116" />
        <rect x="472" y="92" width="60" height="116" />
      </svg>
    </div>
  );
}

function FeaturedCard({ match }: { match: MatchSearchResult }) {
  const [first] = match.slots;
  const tz = match.venue.timezone;
  const day = formatWeekday(first, tz);
  return (
    <Link
      href={`/partidos/${match.id}`}
      className="absolute -bottom-7 -left-8 flex w-[300px] flex-col gap-2.5 rounded-lg bg-surface px-5 py-[18px] text-foreground no-underline shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <SportMonogram sport={match.sport} className="size-10 text-sm" />
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-bold">
            {day.charAt(0).toUpperCase() + day.slice(1)} {formatTime(first, tz)}
          </span>
          <span className="truncate text-xs text-neutral-700">{match.venue.name}</span>
        </div>
        <span className="ml-auto">
          <MissingCount missing={match.missing} />
        </span>
      </div>
      <CapacityBar value={match.filled} capacity={match.capacity} className="h-2" />
    </Link>
  );
}

export default async function HomePage() {
  const actor = await getActor();
  const base = { center: DEFAULT_CENTER, radiusKm: DEFAULT_FILTERS.km, sort: "pronto" as const, limit: 3 };
  const [sports, week] = await Promise.all([listActiveSports(), searchMatches(actor, { ...base, when: "semana" })]);
  // Si esta semana no hay nada, mostramos lo próximo que haya.
  const thisWeek = week.total > 0;
  const nearby = thisWeek ? week : await searchMatches(actor, { ...base, when: "todas" });
  const allHref = exploreHref({ ...DEFAULT_FILTERS, when: thisWeek ? "semana" : "todas" });
  const [featured] = nearby.matches;

  return (
    <>
      <section className="grid items-center gap-12 px-4 pt-8 pb-12 min-[900px]:grid-cols-[1.05fr_.95fr] min-[900px]:px-10">
        <div className="flex flex-col gap-5">
          <Badge variant="accent-2" className="self-start">
            {thisWeek
              ? `Rosario · ${week.total === 1 ? "1 partido" : `${week.total} partidos`} esta semana`
              : "Rosario · fútbol, pádel, vóley y más"}
          </Badge>
          <h1 className="text-[40px] leading-[1.05] sm:text-[52px]">
            Te faltan tres
            <br />
            para el fútbol 5
          </h1>
          <p className="max-w-[440px] text-[17px] text-neutral-800">
            Publicá el partido con dos o tres horarios posibles. Los que se suman
            votan cuál les sirve y el partido se confirma solo cuando llega al
            cupo.
          </p>
          <HomeSearch sports={sports.map(({ slug, name }) => ({ slug, name }))} />
          <nav aria-label="Deportes" className="flex flex-wrap gap-2">
            {sports.slice(0, 4).map((s) => (
              <Link key={s.slug} href={exploreHref({ ...DEFAULT_FILTERS, sport: s.slug })} className={cn(tagLink, "bg-neutral-100 text-neutral-800 hover:bg-neutral-200")}>
                {s.name}
              </Link>
            ))}
            <Link href="/explorar" className={cn(tagLink, "border border-accent text-accent hover:bg-accent-100")}>
              Ver todos
            </Link>
          </nav>
        </div>

        <div className="relative hidden min-[900px]:block">
          <Pitch />
          {featured && <FeaturedCard match={featured} />}
        </div>
      </section>

      <section className="flex flex-col gap-5 px-4 pt-6 pb-10 min-[900px]:px-10 min-[900px]:pt-12">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="m-0 text-[28px]">{thisWeek ? "Cerca tuyo, esta semana" : "Próximos partidos"}</h2>
          {nearby.total > 0 && (
            <Link href={allHref} className="text-sm sm:ml-auto">
              {nearby.total === 1 ? "Ver el partido" : `Ver los ${nearby.total} partidos`}
            </Link>
          )}
        </div>
        {nearby.matches.length > 0 ? (
          <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.matches.map((m) => (
              <li key={m.id}>
                <Link href={`/partidos/${m.id}`} className="block h-full rounded-md text-foreground no-underline">
                  <MatchTile match={m} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg bg-surface p-8">
            <span className="font-heading text-2xl">Todavía no hay partidos con lugar</span>
            <span className="text-sm text-neutral-800">Armá el primero: elegí la cancha, proponé dos o tres horarios y compartilo.</span>
            <Button asChild>
              <Link href="/partidos/nuevo">Crear partido</Link>
            </Button>
          </div>
        )}
      </section>

      <section
        id="como-funciona"
        className="grid gap-7 px-4 pt-2 pb-12 sm:grid-cols-3 min-[900px]:px-10"
      >
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col gap-2">
            <span className="font-heading text-4xl text-accent">{i + 1}</span>
            <span className="text-[17px] font-bold">{step.title}</span>
            <span className="text-sm text-neutral-800">{step.body}</span>
          </div>
        ))}
      </section>
    </>
  );
}
