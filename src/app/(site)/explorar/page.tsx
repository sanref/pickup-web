import type { Metadata } from "next";
import { DEFAULT_CENTER } from "@/lib/geo";
import { parseExploreParams } from "@/lib/validations/search";
import { getActor } from "@/server/auth/session";
import { listActiveSports } from "@/server/services/profiles";
import { searchMatches } from "@/server/services/search";
import { ExploreView } from "./explore-view";

export const metadata: Metadata = {
  title: "Explorar partidos",
  description: "Partidos de fútbol, pádel, vóley y más con lugar libre cerca tuyo. Sumate y votá el horario.",
};

export default async function ExplorePage({ searchParams }: PageProps<"/explorar">) {
  const filters = parseExploreParams(await searchParams);
  const [actor, sports] = await Promise.all([getActor(), listActiveSports()]);
  const sport = sports.find((s) => s.slug === filters.sport);
  const { total, matches } = await searchMatches(actor, {
    center: filters.center ?? DEFAULT_CENTER,
    radiusKm: filters.km,
    sportId: sport?.id,
    level: filters.level,
    when: filters.when,
    sort: filters.sort,
  });

  return (
    <ExploreView
      filters={{ ...filters, sport: sport?.slug ?? null }}
      sports={sports.map(({ id, slug, name }) => ({ id, slug, name }))}
      matches={matches}
      total={total}
    />
  );
}
