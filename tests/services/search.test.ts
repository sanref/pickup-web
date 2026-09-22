// Integración de la búsqueda de partidos contra una rama de Neon (ver match-lifecycle.test.ts).
// Usa las sedes de demo de db/seed-dev y solo mira sus propios partidos: la rama puede tener otros.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/session";
import type { CreateMatchInput } from "@/lib/validations/match";

const url = process.env.TEST_NEON_DATABASE_URL;
const LA_CANTERA = { id: "00000000-0000-4000-a000-000000000001", lat: -32.9383, lng: -60.656 };
// El Potrero, en Fisherton: unos 7 km al oeste de La Cantera.
const EL_POTRERO_ID = "00000000-0000-4000-a000-000000000002";

type Matches = typeof import("@/server/services/matches");
type Search = typeof import("@/server/services/search");
type Db = typeof import("@/server/db/client");

describe.skipIf(!url)("búsqueda de partidos", () => {
  let svc: Matches;
  let search: Search;
  let dbm: Db;
  let sportId: number;
  let otherSportId: number;
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

  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  async function newMatch(organizer: Actor, overrides: Partial<CreateMatchInput> & { days?: number[] } = {}) {
    const { days = [3], ...rest } = overrides;
    const { id } = await svc.createMatch(organizer, {
      sportId,
      venueId: LA_CANTERA.id,
      title: "Búsqueda de prueba automática",
      description: "",
      capacity: 10,
      level: null,
      pricePerPerson: null,
      visibility: "public",
      slots: days.map((d) => ({ date: inDays(d), time: "20:00", durationMinutes: 60 as const })),
      ...rest,
    });
    matchIds.push(id);
    return id;
  }

  async function found(actor: Actor | null, input: Partial<Parameters<Search["searchMatches"]>[1]> = {}) {
    const { matches } = await search.searchMatches(actor, { center: LA_CANTERA, radiusKm: 2, ...input });
    return new Map(matches.filter((m) => matchIds.includes(m.id)).map((m) => [m.id, m]));
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    dbm = await import("@/server/db/client");
    svc = await import("@/server/services/matches");
    search = await import("@/server/services/search");
    const sports = await dbm.db.select().from(dbm.schema.sports).orderBy(dbm.schema.sports.id).limit(2);
    [sportId, otherSportId] = sports.map((s) => s.id);
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

  it("filtra por distancia a la sede", async () => {
    const [organizer] = await makeActors(1, "dist");
    const near = await newMatch(organizer);
    const far = await newMatch(organizer, { venueId: EL_POTRERO_ID });

    const close = await found(null, { radiusKm: 2 });
    expect(close.has(near)).toBe(true);
    expect(close.has(far)).toBe(false);
    expect(close.get(near)!.distanceKm).toBeLessThan(0.1);

    const wide = await found(null, { radiusKm: 10 });
    expect(wide.get(far)!.distanceKm).toBeGreaterThan(5);
  });

  it("no muestra privados ni partidos sin lugar", async () => {
    const [organizer, a, b] = await makeActors(3, "lugar");
    const hidden = await newMatch(organizer, { visibility: "private" });
    // En votación: la opción más votada llega al cupo (el organizador ya vota todas).
    const fullVote = await newMatch(organizer, { capacity: 2 });
    const [slot] = (await svc.getMatchDetail(organizer, fullVote))!.slots;
    await svc.setVotes(a, fullVote, [slot.id]);
    // Confirmado con lugar: 2 de 3.
    const withRoom = await newMatch(organizer, { capacity: 3 });
    const [roomSlot] = (await svc.getMatchDetail(organizer, withRoom))!.slots;
    await svc.setVotes(b, withRoom, [roomSlot.id]);
    await svc.confirmSlot(organizer, withRoom, roomSlot.id);

    const results = await found(b);
    expect(results.has(hidden)).toBe(false);
    expect(results.has(fullVote)).toBe(false);
    const room = results.get(withRoom)!;
    expect(room).toMatchObject({ status: "confirmed", filled: 2, missing: 1, viewerJoined: true });
    expect(room.slots).toHaveLength(1);
    expect(room.people.map((p) => p.userId).sort()).toEqual([organizer.user.id, b.user.id].sort());
  });

  it("filtra por deporte, nivel y fecha", async () => {
    const [organizer] = await makeActors(1, "filtros");
    const anyLevel = await newMatch(organizer, { days: [2, 30] });
    const beginners = await newMatch(organizer, { level: "beginner", sportId: otherSportId });
    const later = await newMatch(organizer, { days: [40] });

    const advanced = await found(null, { level: "advanced" });
    expect(advanced.has(anyLevel)).toBe(true);
    expect(advanced.has(beginners)).toBe(false);

    const bySport = await found(null, { sportId: otherSportId });
    expect([...bySport.keys()]).toEqual([beginners]);

    // "Esta semana" termina el domingo: un partido a 40 días nunca entra y el de dos opciones
    // solo muestra la que cae en la ventana.
    const week = await found(null, { when: "semana" });
    expect(week.has(later)).toBe(false);
    const all = await found(null, { when: "todas" });
    expect(all.get(anyLevel)!.slots).toHaveLength(2);
    if (week.has(anyLevel)) expect(week.get(anyLevel)!.slots).toHaveLength(1);
  });
});
