import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VenueBrowser } from "@/components/venue/venue-browser";
import { cn } from "@/lib/utils";
import { getActor } from "@/server/auth/session";
import { listActiveSports } from "@/server/services/profiles";
import { searchVenues } from "@/server/services/venues";

export const metadata: Metadata = { title: "Sedes" };

export default async function VenuesPage({ searchParams }: PageProps<"/sedes">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const sportSlug = typeof params.deporte === "string" ? params.deporte : "";
  const [actor, sports] = await Promise.all([getActor(), listActiveSports()]);
  const sport = sports.find((s) => s.slug === sportSlug);
  const venues = await searchVenues(actor, { q, sportId: sport?.id, limit: 60 });

  const href = (slug?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (slug) p.set("deporte", slug);
    const s = p.toString();
    return s ? `/sedes?${s}` : "/sedes";
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 min-[900px]:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[34px] leading-tight font-bold tracking-[-0.03em]">Sedes</h1>
          <p className="m-0 text-sm text-text-2">Canchas y clubes donde se arman partidos.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/sedes/nueva">Proponer una sede</Link>
        </Button>
      </div>

      <form className="flex max-w-xl gap-2.5" role="search">
        {sport && <input type="hidden" name="deporte" value={sport.slug} />}
        <Input name="q" defaultValue={q} placeholder="Buscar por nombre o dirección" aria-label="Buscar sedes" />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <nav aria-label="Filtrar por deporte" className="flex flex-wrap gap-2">
        {[{ slug: undefined, name: "Todos" }, ...sports].map((s) => {
          const on = (s.slug ?? "") === (sport?.slug ?? "");
          return (
            <Link
              key={s.slug ?? "todos"}
              href={href(s.slug)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] no-underline transition-colors duration-150 sm:min-h-9",
                on ? "bg-coral-100 text-navy" : "tag-neutral hover:bg-neutral-300",
              )}
            >
              {s.name}
            </Link>
          );
        })}
      </nav>

      {venues.length > 0 ? (
        <VenueBrowser venues={venues} />
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-edge bg-surface p-8 shadow-sm">
          <span className="text-2xl font-bold tracking-[-0.02em]">No encontramos sedes</span>
          <span className="text-sm text-text-2">Probá con otro nombre o proponé la cancha donde jugás.</span>
          <div className="flex flex-wrap gap-2.5">
            {(q || sport) && (
              <Button asChild variant="outline">
                <Link href="/sedes">Ver todas</Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/sedes/nueva">Proponer una sede</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
