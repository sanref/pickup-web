import "server-only";
import { and, asc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { addDaysToKey, minutesToTime, zonedMinutes, zonedToUtc } from "@/lib/dates";
import {
  formatDuration,
  isValidDuration,
  type BookingInput,
  type CourtInput,
  type VenueDataInput,
} from "@/lib/validations/venue-admin";
import type { Actor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { db, schema } from "@/server/db/client";
import {
  PG_EXCLUSION_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  UserError,
  pgErrorCode,
} from "@/server/errors";
import { ensureProfile } from "./profiles";

// Gestión de sedes. Un admin de sede (venue_managers) gestiona sus sedes; el admin del sitio, todas.
// Todas las funciones que escriben reciben al actor y validan el permiso sobre la sede.

const { venues, venueSports, venueManagers, sports, courts, courtBookings, matches, matchSlots, slotVotes, matchParticipants, profiles } =
  schema;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

// — Permisos —

export type ManagedVenue = {
  id: string;
  name: string;
  address: string;
  city: string;
  timezone: string;
  phone: string | null;
  status: (typeof venues.$inferSelect)["status"];
  sports: { id: number; name: string }[];
};

export async function isVenueManager(userId: string, venueId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: venueManagers.userId })
    .from(venueManagers)
    .where(and(eq(venueManagers.venueId, venueId), eq(venueManagers.userId, userId)));
  return !!row;
}

export async function canManageVenue(actor: Actor | null, venueId: string): Promise<boolean> {
  if (!actor) return false;
  return isAdmin(actor) || isVenueManager(actor.user.id, venueId);
}

/** La sede si el actor la puede gestionar; null si no existe, está fusionada o no tiene permiso. */
export async function getManagedVenue(actor: Actor, venueId: string): Promise<ManagedVenue | null> {
  if (!(await canManageVenue(actor, venueId))) return null;
  const [venue] = await db
    .select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      timezone: venues.timezone,
      phone: venues.phone,
      status: venues.status,
    })
    .from(venues)
    .where(and(eq(venues.id, venueId), isNull(venues.mergedIntoId)));
  if (!venue) return null;
  const venueSportRows = await db
    .select({ id: sports.id, name: sports.name })
    .from(venueSports)
    .innerJoin(sports, eq(sports.id, venueSports.sportId))
    .where(eq(venueSports.venueId, venueId))
    .orderBy(asc(sports.sortOrder));
  return { ...venue, sports: venueSportRows };
}

async function requireManagedVenue(actor: Actor, venueId: string): Promise<ManagedVenue> {
  const venue = await getManagedVenue(actor, venueId);
  if (!venue) throw new UserError("No encontramos la sede.");
  return venue;
}

export type ManagedVenueSummary = { id: string; name: string; address: string; city: string; courts: number };

export async function listManagedVenues(actor: Actor): Promise<ManagedVenueSummary[]> {
  return db
    .select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      courts: sql<number>`(select count(*)::int from ${courts} c where c.venue_id = ${venues.id} and c.is_active)`,
    })
    .from(venueManagers)
    .innerJoin(venues, eq(venues.id, venueManagers.venueId))
    .where(and(eq(venueManagers.userId, actor.user.id), isNull(venues.mergedIntoId)))
    .orderBy(asc(venues.name));
}

export async function hasManagedVenues(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ venueId: venueManagers.venueId })
    .from(venueManagers)
    .innerJoin(venues, eq(venues.id, venueManagers.venueId))
    .where(and(eq(venueManagers.userId, userId), isNull(venues.mergedIntoId)))
    .limit(1);
  return !!row;
}

// — Datos de la sede —

export async function updateVenueData(actor: Actor, venueId: string, input: VenueDataInput) {
  await requireManagedVenue(actor, venueId);
  const wanted = [...new Set(input.sportIds)];
  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: sports.id })
      .from(sports)
      .where(and(inArray(sports.id, wanted), eq(sports.isActive, true)));
    if (active.length !== wanted.length) throw new UserError("Revisá los deportes.");

    // Una actividad con canchas activas no se puede sacar de la sede.
    const inUse = await tx
      .selectDistinct({ id: sports.id, name: sports.name })
      .from(courts)
      .innerJoin(sports, eq(sports.id, courts.sportId))
      .where(and(eq(courts.venueId, venueId), eq(courts.isActive, true)));
    const missing = inUse.filter((s) => !wanted.includes(s.id));
    if (missing.length) {
      throw new UserError(`${missing.map((s) => s.name).join(", ")} tiene canchas activas: desactivalas antes de sacar el deporte.`);
    }

    await tx
      .update(venues)
      .set({ name: input.name, phone: input.phone || null })
      .where(eq(venues.id, venueId));
    await tx.delete(venueSports).where(eq(venueSports.venueId, venueId));
    await tx.insert(venueSports).values(wanted.map((sportId) => ({ venueId, sportId })));
  });
}

// — Admins de sede (los asigna el admin del sitio) —

export type VenueManagerRow = { userId: string; displayName: string; avatarUrl: string | null; email: string | null };

export async function listVenueManagers(venueId: string): Promise<VenueManagerRow[]> {
  return db
    .select({
      userId: venueManagers.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      email: sql<string | null>`(select u.email from neon_auth."user" u where u.id = ${venueManagers.userId})`,
    })
    .from(venueManagers)
    .innerJoin(profiles, eq(profiles.userId, venueManagers.userId))
    .where(eq(venueManagers.venueId, venueId))
    .orderBy(asc(venueManagers.createdAt));
}

function assertSiteAdmin(actor: Actor) {
  if (!isAdmin(actor)) throw new UserError("Solo un administrador de PickUp puede asignar admins de sede.");
}

export async function addVenueManager(actor: Actor, venueId: string, email: string) {
  assertSiteAdmin(actor);
  await requireManagedVenue(actor, venueId);
  const result = await db.execute<{ id: string; name: string | null; image: string | null }>(
    sql`select id, name, image from neon_auth."user" where lower(email) = ${email.toLowerCase()} limit 1`,
  );
  const user = result.rows[0];
  if (!user) throw new UserError("No hay ninguna cuenta con ese email. Pedile que se registre primero.");
  await ensureProfile({ id: user.id, name: user.name, image: user.image });
  await db.insert(venueManagers).values({ venueId, userId: user.id, addedBy: actor.user.id }).onConflictDoNothing();
}

export async function removeVenueManager(actor: Actor, venueId: string, userId: string) {
  assertSiteAdmin(actor);
  await db.delete(venueManagers).where(and(eq(venueManagers.venueId, venueId), eq(venueManagers.userId, userId)));
}

// — Canchas —

export type Court = {
  id: string;
  name: string;
  sportId: number;
  sportName: string;
  slotMinutes: number;
  isActive: boolean;
  /** Tiene turnos o partidos: no se puede borrar, solo desactivar. */
  inUse: boolean;
};

export async function listCourts(venueId: string, { activeOnly = false } = {}): Promise<Court[]> {
  return db
    .select({
      id: courts.id,
      name: courts.name,
      sportId: courts.sportId,
      sportName: sports.name,
      slotMinutes: courts.slotMinutes,
      isActive: courts.isActive,
      inUse: sql<boolean>`(exists (select 1 from ${courtBookings} b where b.court_id = ${courts.id})
        or exists (select 1 from ${matches} m where m.court_id = ${courts.id}))`,
    })
    .from(courts)
    .innerJoin(sports, eq(sports.id, courts.sportId))
    .where(and(eq(courts.venueId, venueId), activeOnly ? eq(courts.isActive, true) : undefined))
    .orderBy(asc(courts.sortOrder), asc(courts.name));
}

async function assertActiveSport(tx: Executor, sportId: number) {
  const [sport] = await tx
    .select({ id: sports.id })
    .from(sports)
    .where(and(eq(sports.id, sportId), eq(sports.isActive, true)));
  if (!sport) throw new UserError("Elegí la actividad.");
}

function courtWriteError(error: unknown): never {
  if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw new UserError("Ya hay una cancha con ese nombre en la sede.");
  throw error;
}

export async function createCourt(actor: Actor, venueId: string, input: CourtInput): Promise<{ id: string }> {
  await requireManagedVenue(actor, venueId);
  try {
    return await db.transaction(async (tx) => {
      await assertActiveSport(tx, input.sportId);
      const [last] = await tx
        .select({ max: sql<number>`coalesce(max(${courts.sortOrder}), 0)::int` })
        .from(courts)
        .where(eq(courts.venueId, venueId));
      const [court] = await tx
        .insert(courts)
        .values({
          venueId,
          name: input.name,
          sportId: input.sportId,
          slotMinutes: input.slotMinutes,
          isActive: input.isActive,
          sortOrder: Math.min(last.max + 10, 32_000),
        })
        .returning({ id: courts.id });
      // La actividad de la cancha pasa a figurar entre los deportes de la sede.
      await tx.insert(venueSports).values({ venueId, sportId: input.sportId }).onConflictDoNothing();
      return court;
    });
  } catch (error) {
    courtWriteError(error);
  }
}

export async function updateCourt(actor: Actor, venueId: string, courtId: string, input: CourtInput) {
  await requireManagedVenue(actor, venueId);
  try {
    await db.transaction(async (tx) => {
      await assertActiveSport(tx, input.sportId);
      const updated = await tx
        .update(courts)
        .set({ name: input.name, sportId: input.sportId, slotMinutes: input.slotMinutes, isActive: input.isActive })
        .where(and(eq(courts.id, courtId), eq(courts.venueId, venueId)))
        .returning({ id: courts.id });
      if (!updated.length) throw new UserError("No encontramos la cancha.");
      await tx.insert(venueSports).values({ venueId, sportId: input.sportId }).onConflictDoNothing();
    });
  } catch (error) {
    courtWriteError(error);
  }
}

export async function deleteCourt(actor: Actor, venueId: string, courtId: string) {
  await requireManagedVenue(actor, venueId);
  try {
    await db.delete(courts).where(and(eq(courts.id, courtId), eq(courts.venueId, venueId)));
  } catch (error) {
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new UserError("La cancha tiene turnos o partidos: desactivala en lugar de borrarla.");
    }
    throw error;
  }
}

// — Turnos —

export type CalendarBooking = {
  id: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  match: { id: string; title: string } | null;
};

/** Opción de horario de un partido en votación con cancha elegida: todavía no reserva, pero la sede la ve. */
export type TentativeSlot = {
  slotId: string;
  matchId: string;
  title: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  votes: number;
  capacity: number;
};

/** Rango [desde, hasta) de días locales de la sede → instantes UTC. */
function dayRange(fromKey: string, toKey: string, timeZone: string) {
  return { from: zonedToUtc(fromKey, "00:00", timeZone), to: zonedToUtc(toKey, "00:00", timeZone) };
}

export async function listBookings(venue: Pick<ManagedVenue, "id" | "timezone">, fromKey: string, toKey: string): Promise<CalendarBooking[]> {
  const { from, to } = dayRange(fromKey, toKey, venue.timezone);
  const rows = await db
    .select({
      id: courtBookings.id,
      courtId: courtBookings.courtId,
      startsAt: courtBookings.startsAt,
      endsAt: courtBookings.endsAt,
      customerName: courtBookings.customerName,
      customerPhone: courtBookings.customerPhone,
      notes: courtBookings.notes,
      matchId: courtBookings.matchId,
      matchTitle: matches.title,
    })
    .from(courtBookings)
    .innerJoin(courts, eq(courts.id, courtBookings.courtId))
    .leftJoin(matches, eq(matches.id, courtBookings.matchId))
    .where(
      and(
        eq(courts.venueId, venue.id),
        eq(courtBookings.status, "booked"),
        lt(courtBookings.startsAt, to),
        gt(courtBookings.endsAt, from),
      ),
    )
    .orderBy(asc(courtBookings.startsAt));
  return rows.map(({ matchId, matchTitle, ...r }) => ({ ...r, match: matchId && matchTitle ? { id: matchId, title: matchTitle } : null }));
}

export async function listTentativeSlots(venue: Pick<ManagedVenue, "id" | "timezone">, fromKey: string, toKey: string): Promise<TentativeSlot[]> {
  const { from, to } = dayRange(fromKey, toKey, venue.timezone);
  const rows = await db
    .select({
      slotId: matchSlots.id,
      matchId: matches.id,
      title: matches.title,
      courtId: matches.courtId,
      startsAt: matchSlots.startsAt,
      endsAt: matchSlots.endsAt,
      capacity: matches.capacity,
      votes: sql<number>`(select count(*)::int from ${slotVotes} sv join ${matchParticipants} mp
        on mp.match_id = sv.match_id and mp.user_id = sv.user_id
        where sv.slot_id = ${matchSlots.id} and mp.status <> 'left')`,
    })
    .from(matchSlots)
    .innerJoin(matches, eq(matches.id, matchSlots.matchId))
    .where(
      and(
        eq(matches.venueId, venue.id),
        eq(matches.status, "open"),
        sql`${matches.courtId} is not null`,
        lt(matchSlots.startsAt, to),
        gt(matchSlots.endsAt, from),
      ),
    )
    .orderBy(asc(matchSlots.startsAt));
  return rows.map((r) => ({ ...r, courtId: r.courtId! }));
}

/** Primer turno activo de la cancha que se superpone con [startsAt, endsAt). */
export async function findCourtConflict(
  tx: Executor,
  courtId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): Promise<{ id: string; startsAt: Date; endsAt: Date } | null> {
  const [row] = await tx
    .select({ id: courtBookings.id, startsAt: courtBookings.startsAt, endsAt: courtBookings.endsAt })
    .from(courtBookings)
    .where(
      and(
        eq(courtBookings.courtId, courtId),
        eq(courtBookings.status, "booked"),
        lt(courtBookings.startsAt, endsAt),
        gt(courtBookings.endsAt, startsAt),
        excludeBookingId ? ne(courtBookings.id, excludeBookingId) : undefined,
      ),
    )
    .limit(1);
  return row ?? null;
}

type CourtForBooking = { id: string; slotMinutes: number; isActive: boolean; name: string };

async function courtOfVenue(tx: Executor, venueId: string, courtId: string): Promise<CourtForBooking> {
  const [court] = await tx
    .select({ id: courts.id, slotMinutes: courts.slotMinutes, isActive: courts.isActive, name: courts.name })
    .from(courts)
    .where(and(eq(courts.id, courtId), eq(courts.venueId, venueId)));
  if (!court) throw new UserError("No encontramos la cancha.");
  return court;
}

function bookingTimes(venue: ManagedVenue, court: CourtForBooking, input: BookingInput) {
  if (!isValidDuration(input.durationMinutes, court.slotMinutes)) {
    throw new UserError(`En ${court.name} los turnos son de ${formatDuration(court.slotMinutes)} o múltiplos.`);
  }
  const startsAt = zonedToUtc(input.date, input.time, venue.timezone);
  return { startsAt, endsAt: new Date(startsAt.getTime() + input.durationMinutes * 60_000) };
}

function bookingWriteError(error: unknown): never {
  if (pgErrorCode(error) === PG_EXCLUSION_VIOLATION) {
    throw new UserError("Ese horario se superpone con otro turno de la cancha.");
  }
  throw error;
}

function customerFields(input: BookingInput) {
  return {
    customerName: input.customerName || null,
    customerPhone: input.customerPhone || null,
    notes: input.notes || null,
  };
}

export async function createBooking(actor: Actor, venueId: string, input: BookingInput): Promise<{ id: string }> {
  const venue = await requireManagedVenue(actor, venueId);
  const court = await courtOfVenue(db, venueId, input.courtId);
  if (!court.isActive) throw new UserError("Esa cancha está desactivada.");
  const times = bookingTimes(venue, court, input);
  try {
    const [booking] = await db
      .insert(courtBookings)
      .values({ courtId: court.id, ...times, ...customerFields(input), createdBy: actor.user.id })
      .returning({ id: courtBookings.id });
    return booking;
  } catch (error) {
    bookingWriteError(error);
  }
}

async function editableBooking(venueId: string, bookingId: string) {
  const [booking] = await db
    .select({ id: courtBookings.id, matchId: courtBookings.matchId, status: courtBookings.status })
    .from(courtBookings)
    .innerJoin(courts, eq(courts.id, courtBookings.courtId))
    .where(and(eq(courtBookings.id, bookingId), eq(courts.venueId, venueId)));
  if (!booking || booking.status !== "booked") throw new UserError("No encontramos el turno.");
  if (booking.matchId) throw new UserError("Este turno es de un partido de PickUp: lo maneja el organizador.");
  return booking;
}

export async function updateBooking(actor: Actor, venueId: string, bookingId: string, input: BookingInput) {
  const venue = await requireManagedVenue(actor, venueId);
  await editableBooking(venueId, bookingId);
  const court = await courtOfVenue(db, venueId, input.courtId);
  const times = bookingTimes(venue, court, input);
  try {
    await db
      .update(courtBookings)
      .set({ courtId: court.id, ...times, ...customerFields(input) })
      .where(eq(courtBookings.id, bookingId));
  } catch (error) {
    bookingWriteError(error);
  }
}

export async function cancelBooking(actor: Actor, venueId: string, bookingId: string) {
  await requireManagedVenue(actor, venueId);
  await editableBooking(venueId, bookingId);
  await db.update(courtBookings).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(courtBookings.id, bookingId));
}

// — Para el armado de partidos (cualquier usuario logueado) —

export type CourtOption = { id: string; name: string; slotMinutes: number };

export async function listCourtsForMatch(venueId: string, sportId: number): Promise<CourtOption[]> {
  return db
    .select({ id: courts.id, name: courts.name, slotMinutes: courts.slotMinutes })
    .from(courts)
    .where(and(eq(courts.venueId, venueId), eq(courts.sportId, sportId), eq(courts.isActive, true)))
    .orderBy(asc(courts.sortOrder), asc(courts.name));
}

/** Franjas ocupadas de una cancha en un día local de la sede ("HH:mm"; "24:00" si termina después de medianoche). */
export async function getCourtBusy(courtId: string, dateKey: string): Promise<{ start: string; end: string }[]> {
  const [court] = await db
    .select({ timezone: venues.timezone })
    .from(courts)
    .innerJoin(venues, eq(venues.id, courts.venueId))
    .where(eq(courts.id, courtId));
  if (!court) return [];
  const { from, to } = dayRange(dateKey, addDaysToKey(dateKey, 1), court.timezone);
  const rows = await db
    .select({ startsAt: courtBookings.startsAt, endsAt: courtBookings.endsAt })
    .from(courtBookings)
    .where(and(eq(courtBookings.courtId, courtId), eq(courtBookings.status, "booked"), lt(courtBookings.startsAt, to), gt(courtBookings.endsAt, from)))
    .orderBy(asc(courtBookings.startsAt));
  return rows.map((r) => ({
    start: r.startsAt <= from ? "00:00" : minutesToTime(zonedMinutes(r.startsAt, court.timezone)),
    end: r.endsAt >= to ? "24:00" : minutesToTime(zonedMinutes(r.endsAt, court.timezone)),
  }));
}
