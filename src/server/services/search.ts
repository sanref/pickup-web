import "server-only";
import { and, asc, eq, inArray, lte, ne, sql, type SQL } from "drizzle-orm";
import type { When, Sort } from "@/lib/validations/search";
import type { SkillLevel } from "@/lib/validations/profile";
import type { Actor } from "@/server/auth/session";
import { db, schema } from "@/server/db/client";
import { publicName } from "./matches";

const { matches, matchSlots, matchParticipants, slotVotes, sports, venues, profiles } = schema;

type LatLng = { lat: number; lng: number };

export type SearchMatchesInput = {
  center: LatLng;
  radiusKm: number;
  sportId?: number | null;
  level?: SkillLevel | null;
  when?: When;
  sort?: Sort;
  limit?: number;
};

export type MatchSearchResult = {
  id: string;
  title: string;
  status: "open" | "confirmed";
  capacity: number;
  level: SkillLevel | null;
  pricePerPerson: number | null;
  sport: { id: number; name: string; slug: string };
  venue: { id: string; name: string; city: string; timezone: string; location: LatLng };
  distanceKm: number;
  /** Opciones dentro de la ventana de fechas (en un confirmado, solo el horario confirmado). */
  slots: Date[];
  /** Votos de la opción que va ganando (en votación) o confirmados. */
  filled: number;
  missing: number;
  participantCount: number;
  /** Los primeros anotados, para la pila de avatares. */
  people: { userId: string; displayName: string; avatarUrl: string | null }[];
  viewerJoined: boolean;
};

function point({ lat, lng }: LatLng): SQL {
  return sql`st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography`;
}

// Semana = lunes a domingo en la zona horaria de la sede.
function weekStart(plusDays: number): SQL {
  return sql`((date_trunc('week', now() at time zone ${venues.timezone}) + ${`${plusDays} days`}::interval) at time zone ${venues.timezone})`;
}

// Opciones que cuentan para la búsqueda: por delante, dentro de la ventana y, si el partido está
// confirmado, solo la confirmada. Requiere `matches` y `venues` en el FROM de la consulta de afuera.
function slotInWindow(slot: { id: SQL; startsAt: SQL }, when: When): SQL {
  const window =
    when === "semana"
      ? sql`and ${slot.startsAt} < ${weekStart(7)}`
      : when === "finde"
        ? sql`and ${slot.startsAt} >= ${weekStart(5)} and ${slot.startsAt} < ${weekStart(7)}`
        : sql``;
  return sql`(${slot.startsAt} > now() and (${matches.status} = 'open' or ${slot.id} = ${matches.confirmedSlotId}) ${window})`;
}

// Partidos públicos con lugar cerca de un punto: en votación o confirmados, con alguna opción por delante.
// En votación, "lugar" es respecto de la opción más votada; confirmado, respecto de los confirmados.
export async function searchMatches(
  actor: Actor | null,
  { center, radiusKm, sportId, level, when = "todas", sort = "cerca", limit = 60 }: SearchMatchesInput,
): Promise<{ total: number; matches: MatchSearchResult[] }> {
  const here = point(center);
  const ms = { id: sql`ms.id`, startsAt: sql`ms.starts_at` };
  const inWindow = slotInWindow(ms, when);

  const distanceKm = sql<number>`st_distance(${venues.location}, ${here}) / 1000`;
  const nextSlot = sql`(select min(ms.starts_at) from ${matchSlots} ms where ms.match_id = ${matches.id} and ${inWindow})`;
  const leadingVotes = sql`(select coalesce(max(n), 0) from (
      select count(*) as n from ${slotVotes} sv
        join ${matchSlots} ms on ms.id = sv.slot_id
        join ${matchParticipants} mp on mp.match_id = sv.match_id and mp.user_id = sv.user_id
       where sv.match_id = ${matches.id} and mp.status <> 'left' and ${inWindow}
       group by sv.slot_id) t)`;
  const confirmedCount = sql`(select count(*) from ${matchParticipants} mp where mp.match_id = ${matches.id} and mp.status = 'confirmed')`;
  const filled = sql<number>`(case when ${matches.status} = 'open' then ${leadingVotes} else ${confirmedCount} end)::int`;

  const rows = await db
    .select({
      id: matches.id,
      title: matches.title,
      status: matches.status,
      capacity: matches.capacity,
      level: matches.level,
      pricePerPerson: matches.pricePerPerson,
      sport: { id: sports.id, name: sports.name, slug: sports.slug },
      venue: { id: venues.id, name: venues.name, city: venues.city, timezone: venues.timezone, location: venues.location },
      distanceKm,
      filled,
      participantCount: sql<number>`(select count(*)::int from ${matchParticipants} mp where mp.match_id = ${matches.id} and mp.status <> 'left')`,
      viewerJoined: actor
        ? sql<boolean>`exists (select 1 from ${matchParticipants} mp where mp.match_id = ${matches.id} and mp.user_id = ${actor.user.id} and mp.status <> 'left')`
        : sql<boolean>`false`,
      total: sql<number>`(count(*) over ())::int`,
    })
    .from(matches)
    .innerJoin(venues, eq(venues.id, matches.venueId))
    .innerJoin(sports, eq(sports.id, matches.sportId))
    .where(
      and(
        eq(matches.visibility, "public"),
        inArray(matches.status, ["open", "confirmed"]),
        sql`st_dwithin(${venues.location}, ${here}, ${radiusKm * 1000})`,
        sportId ? eq(matches.sportId, sportId) : undefined,
        // Un partido sin nivel es para cualquiera: aparece con cualquier filtro de nivel.
        level ? sql`(${matches.level} is null or ${matches.level} = ${level})` : undefined,
        sql`exists (select 1 from ${matchSlots} ms where ms.match_id = ${matches.id} and ${inWindow})`,
        sql`${filled} < ${matches.capacity}`,
      ),
    )
    .orderBy(...(sort === "pronto" ? [sql`${nextSlot}`, distanceKm] : [distanceKm, sql`${nextSlot}`]), asc(matches.id))
    .limit(limit);

  if (rows.length === 0) return { total: 0, matches: [] };
  const ids = rows.map((r) => r.id);

  const ranked = db
    .select({
      matchId: matchParticipants.matchId,
      userId: matchParticipants.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      rank: sql<number>`row_number() over (partition by ${matchParticipants.matchId}
        order by case ${matchParticipants.status} when 'confirmed' then 0 else 1 end, ${matchParticipants.joinedAt})`.as("rank"),
    })
    .from(matchParticipants)
    .innerJoin(profiles, eq(profiles.userId, matchParticipants.userId))
    .where(and(inArray(matchParticipants.matchId, ids), ne(matchParticipants.status, "left")))
    .as("ranked");

  const [slots, people] = await Promise.all([
    db
      .select({ matchId: matchSlots.matchId, startsAt: matchSlots.startsAt })
      .from(matchSlots)
      .innerJoin(matches, eq(matches.id, matchSlots.matchId))
      .innerJoin(venues, eq(venues.id, matches.venueId))
      .where(and(inArray(matchSlots.matchId, ids), slotInWindow({ id: sql`${matchSlots.id}`, startsAt: sql`${matchSlots.startsAt}` }, when)))
      .orderBy(asc(matchSlots.startsAt)),
    db.select().from(ranked).where(lte(ranked.rank, 3)).orderBy(asc(ranked.rank)),
  ]);

  const loggedIn = !!actor;
  return {
    total: rows[0].total,
    matches: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as "open" | "confirmed",
      capacity: r.capacity,
      level: r.level,
      pricePerPerson: r.pricePerPerson == null ? null : Number(r.pricePerPerson),
      sport: r.sport,
      venue: { ...r.venue, location: r.venue.location! },
      distanceKm: Number(r.distanceKm),
      slots: slots.filter((s) => s.matchId === r.id).map((s) => s.startsAt),
      filled: r.filled,
      missing: r.capacity - r.filled,
      participantCount: r.participantCount,
      people: people
        .filter((p) => p.matchId === r.id)
        .map(({ userId, displayName, avatarUrl }) => ({ userId, displayName: publicName(displayName, loggedIn), avatarUrl })),
      viewerJoined: r.viewerJoined,
    })),
  };
}
