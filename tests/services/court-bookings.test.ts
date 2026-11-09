// Integración contra una rama de Neon: canchas, turnos y partidos con cancha.
// Crea perfiles, una cancha, turnos y partidos de prueba y los borra al terminar. Correr con:
//   TEST_NEON_DATABASE_URL=<pooled de una rama de prueba> npm test
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/session";

const url = process.env.TEST_NEON_DATABASE_URL;
// Sede de demo de db/seed-dev (Complejo La Cantera).
const VENUE_ID = "00000000-0000-4000-a000-000000000001";

type Db = typeof import("@/server/db/client");
type Matches = typeof import("@/server/services/matches");
type VenueAdmin = typeof import("@/server/services/venue-admin");

describe.skipIf(!url)("gestión de canchas y turnos", () => {
  let dbm: Db;
  let matches: Matches;
  let venueAdmin: VenueAdmin;
  const createdProfiles: string[] = [];
  const matchIds: string[] = [];
  let courtId: string;
  let sportId: number;

  async function makeActor(tag: string, role: "admin" | "user"): Promise<Actor> {
    const [profile] = await dbm.db
      .insert(dbm.schema.profiles)
      .values({ userId: randomUUID(), displayName: `test-${tag}` })
      .returning();
    createdProfiles.push(profile.userId);
    return {
      user: { id: profile.userId, email: `${tag}@example.com`, name: profile.displayName, image: null, emailVerified: true, role },
      profile,
    };
  }

  function inDays(days: number): string {
    return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  }

  async function newMatch(organizer: Actor, time: string, withCourt = true) {
    const { id } = await matches.createMatch(organizer, {
      sportId,
      venueId: VENUE_ID,
      courtId: withCourt ? courtId : null,
      title: "Partido de prueba con cancha",
      description: "",
      capacity: 2,
      level: null,
      pricePerPerson: null,
      visibility: "public",
      slots: [{ date: inDays(5), time, durationMinutes: 60 }],
    });
    matchIds.push(id);
    return id;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    dbm = await import("@/server/db/client");
    matches = await import("@/server/services/matches");
    venueAdmin = await import("@/server/services/venue-admin");
    const { eq } = await import("drizzle-orm");
    const [sport] = await dbm.db.select().from(dbm.schema.sports).where(eq(dbm.schema.sports.slug, "futbol-5"));
    sportId = sport.id;
  });

  afterAll(async () => {
    if (!dbm) return;
    const { inArray, eq } = await import("drizzle-orm");
    if (courtId) await dbm.db.delete(dbm.schema.courtBookings).where(eq(dbm.schema.courtBookings.courtId, courtId));
    if (matchIds.length) await dbm.db.delete(dbm.schema.matches).where(inArray(dbm.schema.matches.id, matchIds));
    if (courtId) await dbm.db.delete(dbm.schema.courts).where(eq(dbm.schema.courts.id, courtId));
    if (createdProfiles.length) {
      await dbm.db.delete(dbm.schema.notifications).where(inArray(dbm.schema.notifications.userId, createdProfiles));
      await dbm.db.delete(dbm.schema.venueManagers).where(inArray(dbm.schema.venueManagers.userId, createdProfiles));
      await dbm.db.delete(dbm.schema.profiles).where(inArray(dbm.schema.profiles.userId, createdProfiles));
    }
  });

  it("un admin del sitio crea una cancha y da turnos sin superposición", async () => {
    const admin = await makeActor("admin-sitio", "admin");
    ({ id: courtId } = await venueAdmin.createCourt(admin, VENUE_ID, {
      name: `Test ${randomUUID().slice(0, 8)}`,
      sportId,
      slotMinutes: 60,
      isActive: true,
    }));
    const base = { courtId, date: inDays(5), customerName: "Juan", customerPhone: "", notes: "" };
    await venueAdmin.createBooking(admin, VENUE_ID, { ...base, time: "18:00", durationMinutes: 60 });
    await expect(venueAdmin.createBooking(admin, VENUE_ID, { ...base, time: "18:30", durationMinutes: 60 })).rejects.toThrow(/superpone/);
    await expect(venueAdmin.createBooking(admin, VENUE_ID, { ...base, time: "19:00", durationMinutes: 90 })).rejects.toThrow(/múltiplos/);
    // Pegado al anterior: no se superpone.
    await venueAdmin.createBooking(admin, VENUE_ID, { ...base, time: "19:00", durationMinutes: 120 });
  });

  it("un usuario sin la sede asignada no puede dar turnos; asignado como admin de sede, sí", async () => {
    const owner = await makeActor("duenio", "user");
    const booking = { courtId, date: inDays(6), time: "10:00", durationMinutes: 60, customerName: "", customerPhone: "", notes: "" };
    await expect(venueAdmin.createBooking(owner, VENUE_ID, booking)).rejects.toThrow(/No encontramos la sede/);
    await dbm.db.insert(dbm.schema.venueManagers).values({ venueId: VENUE_ID, userId: owner.user.id });
    expect(await venueAdmin.canManageVenue(owner, VENUE_ID)).toBe(true);
    await venueAdmin.createBooking(owner, VENUE_ID, booking);
  });

  it("un partido no puede proponer un horario ocupado de su cancha", async () => {
    const organizer = await makeActor("org-ocupado", "user");
    await expect(newMatch(organizer, "18:00")).rejects.toThrow(/ocupada/);
  });

  it("al confirmar un partido con cancha se reserva el turno y al cancelarlo se libera", async () => {
    const organizer = await makeActor("org-reserva", "user");
    const matchId = await newMatch(organizer, "22:00");
    const detail = await matches.getMatchDetail(organizer, matchId);
    expect(detail!.court?.id).toBe(courtId);
    await matches.confirmSlot(organizer, matchId, detail!.slots[0].id);

    const { and, eq } = await import("drizzle-orm");
    const active = () =>
      dbm.db
        .select({ id: dbm.schema.courtBookings.id })
        .from(dbm.schema.courtBookings)
        .where(and(eq(dbm.schema.courtBookings.matchId, matchId), eq(dbm.schema.courtBookings.status, "booked")));
    expect(await active()).toHaveLength(1);

    await matches.cancelMatch(organizer, matchId);
    expect(await active()).toHaveLength(0);
  });

  it("si la sede dio el horario mientras se votaba, no se puede confirmar", async () => {
    const organizer = await makeActor("org-pisado", "user");
    const admin = await makeActor("admin-pisa", "admin");
    const matchId = await newMatch(organizer, "08:00");
    await venueAdmin.createBooking(admin, VENUE_ID, {
      courtId,
      date: inDays(5),
      time: "08:00",
      durationMinutes: 60,
      customerName: "",
      customerPhone: "",
      notes: "",
    });
    const slotId = (await matches.getMatchDetail(organizer, matchId))!.slots[0].id;
    await expect(matches.confirmSlot(organizer, matchId, slotId)).rejects.toThrow(/reservada/);
  });
});
