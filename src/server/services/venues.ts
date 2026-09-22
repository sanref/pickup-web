import "server-only";
import { and, asc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import type { Actor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { db, schema } from "@/server/db/client";
import type { CreateVenueInput, SimilarVenuesInput } from "@/lib/validations/venue";

const { venues, venueSports, sports, matches } = schema;

export type VenueStatus = (typeof venues.$inferSelect)["status"];
export type VenueSummary = {
  id: string;
  name: string;
  address: string;
  city: string;
  status: VenueStatus;
  location: { lat: number; lng: number };
  sports: { id: number; name: string }[];
  distanceKm?: number;
};

type LatLng = { lat: number; lng: number };

function point({ lat, lng }: LatLng): SQL {
  return sql`st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography`;
}

// Un usuario ve el catálogo verificado y sus propias propuestas; un admin ve todo. Las fusionadas nunca.
function visibleTo(actor: Actor | null): SQL | undefined {
  const notMerged = isNull(venues.mergedIntoId);
  if (isAdmin(actor)) return notMerged;
  const own = actor ? eq(venues.createdBy, actor.user.id) : undefined;
  return and(notMerged, own ? or(eq(venues.status, "verified"), and(own, eq(venues.status, "pending"))) : eq(venues.status, "verified"));
}

async function attachSports<T extends { id: string }>(rows: T[]): Promise<(T & { sports: { id: number; name: string }[] })[]> {
  if (rows.length === 0) return [];
  const links = await db
    .select({ venueId: venueSports.venueId, id: sports.id, name: sports.name })
    .from(venueSports)
    .innerJoin(sports, eq(sports.id, venueSports.sportId))
    .where(inArray(venueSports.venueId, rows.map((r) => r.id)))
    .orderBy(asc(sports.sortOrder));
  return rows.map((r) => ({
    ...r,
    sports: links.filter((l) => l.venueId === r.id).map(({ id, name }) => ({ id, name })),
  }));
}

const summaryColumns = {
  id: venues.id,
  name: venues.name,
  address: venues.address,
  city: venues.city,
  status: venues.status,
  location: venues.location,
};

export async function searchVenues(
  actor: Actor | null,
  { q, near, sportId, limit = 30 }: { q?: string; near?: LatLng; sportId?: number; limit?: number },
): Promise<VenueSummary[]> {
  const term = q?.trim();
  const filters = [visibleTo(actor)];
  if (term) {
    filters.push(sql`(${venues.name} % ${term} or ${venues.name} ilike ${`%${term}%`} or ${venues.address} ilike ${`%${term}%`})`);
  }
  if (sportId) {
    filters.push(sql`exists (select 1 from ${venueSports} vs where vs.venue_id = ${venues.id} and vs.sport_id = ${sportId})`);
  }
  const distance = near ? sql<number>`st_distance(${venues.location}, ${point(near)}) / 1000` : sql<null>`null`;
  const rows = await db
    .select({ ...summaryColumns, distanceKm: distance })
    .from(venues)
    .where(and(...filters))
    .orderBy(
      ...(term ? [sql`similarity(${venues.name}, ${term}) desc`] : []),
      ...(near ? [sql`${venues.location} <-> ${point(near)}`] : []),
      asc(venues.name),
    )
    .limit(limit);
  const withSports = await attachSports(rows.map((r) => ({ ...r, location: r.location! })));
  return withSports.map(({ distanceKm, ...r }) => (distanceKm == null ? r : { ...r, distanceKm: Number(distanceKm) }));
}

export async function getVenue(actor: Actor | null, id: string) {
  const [row] = await db
    .select({ ...summaryColumns, mergedIntoId: venues.mergedIntoId, createdBy: venues.createdBy, googlePlaceId: venues.googlePlaceId })
    .from(venues)
    .where(eq(venues.id, id));
  if (!row) return null;
  if (row.mergedIntoId) return { redirectTo: row.mergedIntoId } as const;
  const visible = row.status === "verified" || isAdmin(actor) || (actor && row.createdBy === actor.user.id && row.status === "pending");
  if (!visible) return null;
  const [venue] = await attachSports([{ ...row, location: row.location! }]);
  return { venue } as const;
}

// Candidatas a duplicado: mismo lugar de Google, a menos de 150 m, o nombre parecido a menos de 1 km.
export async function findSimilarVenues(input: SimilarVenuesInput, excludeId?: string): Promise<VenueSummary[]> {
  const here = point(input.location);
  const rows = await db
    .select({ ...summaryColumns, distanceKm: sql<number>`st_distance(${venues.location}, ${here}) / 1000` })
    .from(venues)
    .where(
      and(
        isNull(venues.mergedIntoId),
        sql`${venues.status} <> 'rejected'`,
        excludeId ? sql`${venues.id} <> ${excludeId}` : undefined,
        or(
          input.googlePlaceId ? eq(venues.googlePlaceId, input.googlePlaceId) : undefined,
          sql`st_dwithin(${venues.location}, ${here}, 150)`,
          sql`(st_dwithin(${venues.location}, ${here}, 1000) and similarity(${venues.name}, ${input.name}) > 0.4)`,
        ),
      ),
    )
    .orderBy(sql`${venues.location} <-> ${here}`)
    .limit(5);
  const withSports = await attachSports(rows.map((r) => ({ ...r, location: r.location! })));
  return withSports.map((r) => ({ ...r, distanceKm: Number(r.distanceKm) }));
}

export type CreateVenueResult = { id: string; existing: boolean };

export async function createVenue(actor: Actor, input: CreateVenueInput): Promise<CreateVenueResult> {
  return db.transaction(async (tx) => {
    // Si alguien ya cargó ese lugar de Google, se reutiliza en vez de duplicarlo.
    const [existing] = await tx
      .select({ id: venues.id, mergedIntoId: venues.mergedIntoId, status: venues.status })
      .from(venues)
      .where(eq(venues.googlePlaceId, input.googlePlaceId));
    if (existing && existing.status !== "rejected") {
      return { id: existing.mergedIntoId ?? existing.id, existing: true };
    }

    const active = await tx
      .select({ id: sports.id })
      .from(sports)
      .where(and(inArray(sports.id, input.sportIds), eq(sports.isActive, true)));
    if (active.length !== new Set(input.sportIds).size) throw new Error("Deporte inválido");

    const [venue] = await tx
      .insert(venues)
      .values({
        name: input.name,
        address: input.address,
        city: input.city,
        location: input.location,
        googlePlaceId: existing ? null : input.googlePlaceId,
        status: isAdmin(actor) ? "verified" : "pending",
        createdBy: actor.user.id,
        ...(isAdmin(actor) ? { reviewedBy: actor.user.id, reviewedAt: new Date() } : {}),
      })
      .returning({ id: venues.id });
    await tx.insert(venueSports).values([...new Set(input.sportIds)].map((sportId) => ({ venueId: venue.id, sportId })));
    return { id: venue.id, existing: false };
  });
}

// — Moderación (solo admin; los llamadores validan con assertAdmin) —

export async function listPendingVenues(): Promise<(VenueSummary & { createdAt: Date; similar: VenueSummary[] })[]> {
  const rows = await db
    .select({ ...summaryColumns, createdAt: venues.createdAt })
    .from(venues)
    .where(and(eq(venues.status, "pending"), isNull(venues.mergedIntoId)))
    .orderBy(asc(venues.createdAt));
  const withSports = await attachSports(rows.map((r) => ({ ...r, location: r.location! })));
  return Promise.all(
    withSports.map(async (v) => ({ ...v, similar: await findSimilarVenues({ name: v.name, location: v.location }, v.id) })),
  );
}

export async function reviewVenue(actor: Actor, id: string, status: "verified" | "rejected") {
  await db
    .update(venues)
    .set({ status, reviewedBy: actor.user.id, reviewedAt: new Date() })
    .where(and(eq(venues.id, id), eq(venues.status, "pending"), isNull(venues.mergedIntoId)));
}

// La sede duplicada queda apuntando a la que sobrevive y sus partidos pasan a la sede buena.
export async function mergeVenue(actor: Actor, id: string, intoId: string) {
  if (id === intoId) throw new Error("No se puede fusionar una sede consigo misma");
  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: venues.id })
      .from(venues)
      .where(and(eq(venues.id, intoId), isNull(venues.mergedIntoId)))
      .for("update");
    if (!target) throw new Error("La sede destino no existe");
    await tx.update(matches).set({ venueId: intoId }).where(eq(matches.venueId, id));
    await tx
      .update(venues)
      .set({ mergedIntoId: intoId, status: "rejected", googlePlaceId: null, reviewedBy: actor.user.id, reviewedAt: new Date() })
      .where(and(eq(venues.id, id), isNull(venues.mergedIntoId)));
  });
}
