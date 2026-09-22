// Integración contra una rama de Neon (el driver de la app usa WebSocket, no sirve un Postgres local).
// Crea perfiles y partidos de prueba y los borra al terminar. Correr con:
//   TEST_NEON_DATABASE_URL=<pooled de una rama de prueba> npm test
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/session";

const url = process.env.TEST_NEON_DATABASE_URL;
// Sede de demo de db/seed-dev (Complejo La Cantera).
const VENUE_ID = "00000000-0000-4000-a000-000000000001";

type Services = typeof import("@/server/services/matches");
type Db = typeof import("@/server/db/client");

describe.skipIf(!url)("ciclo de vida del partido", () => {
  let svc: Services;
  let dbm: Db;
  const created: string[] = [];
  const matchIds: string[] = [];

  async function makeActors(n: number, tag: string): Promise<Actor[]> {
    const rows = Array.from({ length: n }, (_, i) => ({ userId: randomUUID(), displayName: `test-${tag}-${i}` }));
    const inserted = await dbm.db.insert(dbm.schema.profiles).values(rows).returning();
    created.push(...inserted.map((p) => p.userId));
    return inserted.map((profile) => ({
      user: { id: profile.userId, email: `${profile.displayName}@example.com`, name: profile.displayName, image: null, emailVerified: true, role: "user" },
      profile,
    }));
  }

  function inDays(days: number): string {
    return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  }

  async function newMatch(organizer: Actor, capacity: number, slots = 1) {
    const [sport] = await dbm.db.select().from(dbm.schema.sports).limit(1);
    const { id } = await svc.createMatch(organizer, {
      sportId: sport.id,
      venueId: VENUE_ID,
      title: "Partido de prueba automática",
      description: "",
      capacity,
      level: null,
      pricePerPerson: null,
      visibility: "public",
      slots: Array.from({ length: slots }, (_, i) => ({ date: inDays(3 + i), time: "20:00", durationMinutes: 60 as const })),
    });
    matchIds.push(id);
    return id;
  }

  async function statuses(matchId: string) {
    const rows = await dbm.db
      .select({ userId: dbm.schema.matchParticipants.userId, status: dbm.schema.matchParticipants.status })
      .from(dbm.schema.matchParticipants)
      .where((await import("drizzle-orm")).eq(dbm.schema.matchParticipants.matchId, matchId));
    return Object.fromEntries(rows.map((r) => [r.userId, r.status]));
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    dbm = await import("@/server/db/client");
    svc = await import("@/server/services/matches");
  });

  afterAll(async () => {
    if (!dbm) return;
    const { inArray } = await import("drizzle-orm");
    if (matchIds.length) await dbm.db.delete(dbm.schema.matches).where(inArray(dbm.schema.matches.id, matchIds));
    if (created.length) {
      await dbm.db.delete(dbm.schema.notifications).where(inArray(dbm.schema.notifications.userId, created));
      await dbm.db.delete(dbm.schema.profiles).where(inArray(dbm.schema.profiles.userId, created));
    }
  });

  it("20 que se suman a la vez con 9 de 10 lugares: entra 1 y 19 van a la lista de espera", async () => {
    const [organizer, ...voters] = await makeActors(9, "vota");
    const crowd = await makeActors(20, "llega");
    const matchId = await newMatch(organizer, 10);
    const detail = await svc.getMatchDetail(organizer, matchId);
    const slotId = detail!.slots[0].id;
    for (const v of voters) await svc.setVotes(v, matchId, [slotId]);
    await svc.confirmSlot(organizer, matchId, slotId);

    const results = await Promise.all(crowd.map((a) => svc.joinMatch(a, matchId)));
    expect(results.filter((s) => s === "confirmed")).toHaveLength(1);
    expect(results.filter((s) => s === "waitlist")).toHaveLength(19);
    const all = Object.values(await statuses(matchId));
    expect(all.filter((s) => s === "confirmed")).toHaveLength(10);
  });

  it("al confirmar entran por orden de voto; al bajarse un confirmado sube el primero de la espera", async () => {
    const [organizer, a, b, c] = await makeActors(4, "orden");
    const matchId = await newMatch(organizer, 2);
    const slotId = (await svc.getMatchDetail(organizer, matchId))!.slots[0].id;
    await svc.setVotes(a, matchId, [slotId]);
    await svc.setVotes(b, matchId, [slotId]);
    await svc.confirmSlot(organizer, matchId, slotId);

    let s = await statuses(matchId);
    expect([s[organizer.user.id], s[a.user.id], s[b.user.id]]).toEqual(["confirmed", "confirmed", "waitlist"]);
    expect(await svc.joinMatch(c, matchId)).toBe("waitlist");

    await svc.leaveMatch(a, matchId);
    s = await statuses(matchId);
    expect(s[a.user.id]).toBe("left");
    expect(s[b.user.id]).toBe("confirmed");
    expect(s[c.user.id]).toBe("waitlist");
    const detail = await svc.getMatchDetail(c, matchId);
    expect(detail!.viewer.waitlistPosition).toBe(1);
  });

  it("con confirmación automática se confirma sola al llegar al cupo", async () => {
    const [organizer, a] = await makeActors(2, "auto");
    const matchId = await newMatch(organizer, 2, 2);
    const slots = (await svc.getMatchDetail(organizer, matchId))!.slots;
    await svc.setAutoConfirm(organizer, matchId, true);
    await svc.setVotes(a, matchId, [slots[1].id]);
    const detail = await svc.getMatchDetail(organizer, matchId);
    expect(detail!.status).toBe("confirmed");
    expect(detail!.confirmedSlotId).toBe(slots[1].id);
  });

  it("solo el organizador confirma o cancela, y cancelar avisa a los anotados", async () => {
    const [organizer, a] = await makeActors(2, "cancela");
    const matchId = await newMatch(organizer, 10);
    const slotId = (await svc.getMatchDetail(organizer, matchId))!.slots[0].id;
    await svc.setVotes(a, matchId, [slotId]);
    await expect(svc.confirmSlot(a, matchId, slotId)).rejects.toThrow("Solo el organizador");
    await expect(svc.cancelMatch(a, matchId)).rejects.toThrow("Solo el organizador");

    await svc.cancelMatch(organizer, matchId);
    expect((await svc.getMatchDetail(a, matchId))!.status).toBe("cancelled");
    await expect(svc.joinMatch(a, matchId)).rejects.toThrow();
    const { and, eq } = await import("drizzle-orm");
    const notes = await dbm.db
      .select()
      .from(dbm.schema.notifications)
      .where(and(eq(dbm.schema.notifications.userId, a.user.id), eq(dbm.schema.notifications.type, "match_cancelled")));
    expect(notes).toHaveLength(1);
  });
});
