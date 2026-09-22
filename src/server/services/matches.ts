import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import { zonedToUtc } from "@/lib/dates";
import type { CreateMatchInput } from "@/lib/validations/match";
import type { SkillLevel } from "@/lib/validations/profile";
import type { Actor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { db, schema } from "@/server/db/client";
import { UserError } from "@/server/errors";

const { matches, matchSlots, matchParticipants, slotVotes, sports, venues, profiles } = schema;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type MatchStatus = (typeof matches.$inferSelect)["status"];
export type ParticipantStatus = (typeof matchParticipants.$inferSelect)["status"];

const ACTIVE_PARTICIPANT: ParticipantStatus[] = ["interested", "confirmed", "waitlist"];

function newInviteCode(): string {
  // 10 caracteres base32 en minúscula: se tipea fácil y alcanza de sobra para no colisionar.
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
}

// — Alta —

export async function createMatch(actor: Actor, input: CreateMatchInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [sport] = await tx
      .select({ id: sports.id })
      .from(sports)
      .where(and(eq(sports.id, input.sportId), eq(sports.isActive, true)));
    if (!sport) throw new UserError("Elegí un deporte.");

    const [venue] = await tx
      .select({ id: venues.id, timezone: venues.timezone, status: venues.status, createdBy: venues.createdBy })
      .from(venues)
      .where(and(eq(venues.id, input.venueId), isNull(venues.mergedIntoId)));
    const venueUsable =
      venue && (venue.status === "verified" || (venue.status === "pending" && (venue.createdBy === actor.user.id || isAdmin(actor))));
    if (!venueUsable) throw new UserError("Esa sede no está disponible.");

    const now = Date.now();
    const slots = input.slots.map((s) => {
      const startsAt = zonedToUtc(s.date, s.time, venue.timezone);
      return { startsAt, endsAt: new Date(startsAt.getTime() + s.durationMinutes * 60_000) };
    });
    if (slots.some((s) => s.startsAt.getTime() < now + 30 * 60_000)) {
      throw new UserError("Los horarios tienen que ser al menos media hora más adelante.");
    }
    if (slots.some((s) => s.startsAt.getTime() > now + 90 * 24 * 3600_000)) {
      throw new UserError("Los horarios tienen que ser dentro de los próximos 90 días.");
    }
    if (new Set(slots.map((s) => s.startsAt.getTime())).size !== slots.length) {
      throw new UserError("Hay dos horarios iguales.");
    }
    slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const [match] = await tx
      .insert(matches)
      .values({
        sportId: input.sportId,
        venueId: input.venueId,
        organizerId: actor.user.id,
        title: input.title,
        description: input.description || null,
        capacity: input.capacity,
        level: input.level,
        pricePerPerson: input.pricePerPerson == null ? null : input.pricePerPerson.toFixed(2),
        visibility: input.visibility,
        inviteCode: newInviteCode(),
        status: "open",
      })
      .returning({ id: matches.id });

    const inserted = await tx
      .insert(matchSlots)
      .values(slots.map((s) => ({ matchId: match.id, ...s })))
      .returning({ id: matchSlots.id });

    // El organizador es el primer anotado y, como propuso los horarios, arranca votándolos todos.
    await tx.insert(matchParticipants).values({ matchId: match.id, userId: actor.user.id, status: "interested" });
    await tx.insert(slotVotes).values(inserted.map((s) => ({ slotId: s.id, matchId: match.id, userId: actor.user.id })));
    return { id: match.id };
  });
}

// — Lectura —

export type MatchDetail = {
  id: string;
  title: string;
  description: string | null;
  status: MatchStatus;
  visibility: "public" | "private";
  capacity: number;
  level: SkillLevel | null;
  pricePerPerson: number | null;
  currency: string;
  inviteCode: string | null;
  sport: { id: number; name: string; slug: string };
  venue: { id: string; name: string; address: string; city: string; timezone: string; location: { lat: number; lng: number } };
  organizer: { userId: string; displayName: string; avatarUrl: string | null };
  slots: { id: string; startsAt: Date; endsAt: Date; votes: number }[];
  participants: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    status: ParticipantStatus;
    isOrganizer: boolean;
    slotIds: string[];
  }[];
  viewer: { userId: string | null; isOrganizer: boolean; isParticipant: boolean; slotIds: string[] };
};

// Sin sesión se muestra solo el nombre de pila (plan: privacidad de los participantes).
function publicName(name: string, loggedIn: boolean): string {
  return loggedIn ? name : (name.trim().split(/\s+/)[0] ?? name);
}

async function canView(
  tx: Tx | typeof db,
  actor: Actor | null,
  match: { id: string; visibility: string; status: MatchStatus; organizerId: string; inviteCode: string },
  invite?: string | null,
): Promise<boolean> {
  if (isAdmin(actor) || (actor && actor.user.id === match.organizerId)) return true;
  if (match.status === "draft") return false;
  if (match.visibility === "public") return true;
  if (invite && invite === match.inviteCode) return true;
  if (!actor) return false;
  const [row] = await tx
    .select({ status: matchParticipants.status })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, match.id), eq(matchParticipants.userId, actor.user.id)));
  return !!row;
}

export async function getMatchDetail(actor: Actor | null, id: string, invite?: string | null): Promise<MatchDetail | null> {
  const [row] = await db
    .select({
      match: matches,
      sport: { id: sports.id, name: sports.name, slug: sports.slug },
      venue: {
        id: venues.id,
        name: venues.name,
        address: venues.address,
        city: venues.city,
        timezone: venues.timezone,
        location: venues.location,
      },
      organizer: { userId: profiles.userId, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl },
    })
    .from(matches)
    .innerJoin(sports, eq(sports.id, matches.sportId))
    .innerJoin(venues, eq(venues.id, matches.venueId))
    .innerJoin(profiles, eq(profiles.userId, matches.organizerId))
    .where(eq(matches.id, id));
  if (!row || !(await canView(db, actor, row.match, invite))) return null;

  const [slots, people, votes] = await Promise.all([
    db
      .select({ id: matchSlots.id, startsAt: matchSlots.startsAt, endsAt: matchSlots.endsAt })
      .from(matchSlots)
      .where(eq(matchSlots.matchId, id))
      .orderBy(asc(matchSlots.startsAt)),
    db
      .select({
        userId: matchParticipants.userId,
        status: matchParticipants.status,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(matchParticipants)
      .innerJoin(profiles, eq(profiles.userId, matchParticipants.userId))
      .where(and(eq(matchParticipants.matchId, id), inArray(matchParticipants.status, ACTIVE_PARTICIPANT)))
      .orderBy(asc(matchParticipants.joinedAt)),
    db
      .select({ slotId: slotVotes.slotId, userId: slotVotes.userId })
      .from(slotVotes)
      .innerJoin(
        matchParticipants,
        and(eq(matchParticipants.matchId, slotVotes.matchId), eq(matchParticipants.userId, slotVotes.userId)),
      )
      .where(and(eq(slotVotes.matchId, id), inArray(matchParticipants.status, ACTIVE_PARTICIPANT))),
  ]);

  const loggedIn = !!actor;
  const viewerId = actor?.user.id ?? null;
  const votesBy = (userId: string) => votes.filter((v) => v.userId === userId).map((v) => v.slotId);
  const participants = people.map((p) => ({
    ...p,
    displayName: publicName(p.displayName, loggedIn),
    isOrganizer: p.userId === row.match.organizerId,
    slotIds: votesBy(p.userId),
  }));
  const viewerRow = viewerId ? participants.find((p) => p.userId === viewerId) : undefined;

  return {
    id: row.match.id,
    title: row.match.title,
    description: row.match.description,
    status: row.match.status,
    visibility: row.match.visibility,
    capacity: row.match.capacity,
    level: row.match.level,
    pricePerPerson: row.match.pricePerPerson == null ? null : Number(row.match.pricePerPerson),
    currency: row.match.currency,
    // El código de invitación lo ve quien ya tiene acceso por algo más que el link público.
    inviteCode: viewerRow || isAdmin(actor) || viewerId === row.match.organizerId ? row.match.inviteCode : (invite ?? null),
    sport: row.sport,
    venue: { ...row.venue, location: row.venue.location! },
    organizer: { ...row.organizer, displayName: publicName(row.organizer.displayName, loggedIn) },
    slots: slots.map((s) => ({ ...s, votes: votes.filter((v) => v.slotId === s.id).length })),
    participants,
    viewer: {
      userId: viewerId,
      isOrganizer: viewerId === row.match.organizerId,
      isParticipant: !!viewerRow,
      slotIds: viewerRow?.slotIds ?? [],
    },
  };
}

export async function findMatchIdByInvite(code: string): Promise<string | null> {
  const [row] = await db.select({ id: matches.id }).from(matches).where(eq(matches.inviteCode, code));
  return row?.id ?? null;
}

// — Participación —

async function lockOpenMatch(tx: Tx, actor: Actor, matchId: string, invite?: string | null) {
  const [match] = await tx
    .select({
      id: matches.id,
      visibility: matches.visibility,
      status: matches.status,
      organizerId: matches.organizerId,
      inviteCode: matches.inviteCode,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
  if (!match || !(await canView(tx, actor, match, invite))) throw new UserError("No encontramos el partido.");
  if (match.status !== "open") throw new UserError("La votación de este partido ya cerró.");
  return match;
}

async function ensureParticipant(tx: Tx, matchId: string, userId: string) {
  await tx
    .insert(matchParticipants)
    .values({ matchId, userId, status: "interested" })
    .onConflictDoUpdate({
      target: [matchParticipants.matchId, matchParticipants.userId],
      set: { status: "interested", statusChangedAt: sql`now()` },
      setWhere: eq(matchParticipants.status, "left"),
    });
}

// Reemplaza los votos del usuario. Votar lo suma como interesado si todavía no estaba.
export async function setVotes(actor: Actor, matchId: string, slotIds: string[], invite?: string | null) {
  const wanted = [...new Set(slotIds)];
  await db.transaction(async (tx) => {
    await lockOpenMatch(tx, actor, matchId, invite);
    if (wanted.length) {
      const valid = await tx
        .select({ id: matchSlots.id })
        .from(matchSlots)
        .where(and(eq(matchSlots.matchId, matchId), inArray(matchSlots.id, wanted)));
      if (valid.length !== wanted.length) throw new UserError("Ese horario no es de este partido.");
    }
    await ensureParticipant(tx, matchId, actor.user.id);
    await tx
      .delete(slotVotes)
      .where(
        and(
          eq(slotVotes.matchId, matchId),
          eq(slotVotes.userId, actor.user.id),
          wanted.length ? notInArray(slotVotes.slotId, wanted) : undefined,
        ),
      );
    if (wanted.length) {
      await tx
        .insert(slotVotes)
        .values(wanted.map((slotId) => ({ slotId, matchId, userId: actor.user.id })))
        .onConflictDoNothing();
    }
  });
}

export async function joinMatch(actor: Actor, matchId: string, invite?: string | null) {
  await db.transaction(async (tx) => {
    await lockOpenMatch(tx, actor, matchId, invite);
    await ensureParticipant(tx, matchId, actor.user.id);
  });
}

export async function leaveMatch(actor: Actor, matchId: string) {
  await db.transaction(async (tx) => {
    const match = await lockOpenMatch(tx, actor, matchId);
    if (match.organizerId === actor.user.id) throw new UserError("Sos el organizador: no te podés bajar de tu partido.");
    await tx.delete(slotVotes).where(and(eq(slotVotes.matchId, matchId), eq(slotVotes.userId, actor.user.id)));
    await tx
      .update(matchParticipants)
      .set({ status: "left", statusChangedAt: sql`now()` })
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, actor.user.id), ne(matchParticipants.status, "left")));
  });
}

// — Mis partidos —

export type MyMatch = {
  id: string;
  title: string;
  status: MatchStatus;
  capacity: number;
  isOrganizer: boolean;
  organizerName: string;
  venueName: string;
  timezone: string;
  slots: { startsAt: Date; votes: number }[];
  participants: number;
  myVotes: number;
};

export async function listMyOpenMatches(actor: Actor): Promise<MyMatch[]> {
  const mine = await db
    .select({
      id: matches.id,
      title: matches.title,
      status: matches.status,
      capacity: matches.capacity,
      organizerId: matches.organizerId,
      organizerName: profiles.displayName,
      venueName: venues.name,
      timezone: venues.timezone,
    })
    .from(matches)
    .innerJoin(venues, eq(venues.id, matches.venueId))
    .innerJoin(profiles, eq(profiles.userId, matches.organizerId))
    .where(
      and(
        eq(matches.status, "open"),
        or(
          eq(matches.organizerId, actor.user.id),
          sql`exists (select 1 from ${matchParticipants} mp where mp.match_id = ${matches.id} and mp.user_id = ${actor.user.id} and mp.status <> 'left')`,
        ),
      ),
    );
  if (mine.length === 0) return [];
  const ids = mine.map((m) => m.id);

  const [slots, counts, myVotes] = await Promise.all([
    db
      .select({
        matchId: matchSlots.matchId,
        startsAt: matchSlots.startsAt,
        votes: sql<number>`(select count(*)::int from ${slotVotes} sv join ${matchParticipants} mp on mp.match_id = sv.match_id and mp.user_id = sv.user_id where sv.slot_id = ${matchSlots.id} and mp.status <> 'left')`,
      })
      .from(matchSlots)
      .where(inArray(matchSlots.matchId, ids))
      .orderBy(asc(matchSlots.startsAt)),
    db
      .select({ matchId: matchParticipants.matchId, n: sql<number>`count(*)::int` })
      .from(matchParticipants)
      .where(and(inArray(matchParticipants.matchId, ids), inArray(matchParticipants.status, ACTIVE_PARTICIPANT)))
      .groupBy(matchParticipants.matchId),
    db
      .select({ matchId: slotVotes.matchId, n: sql<number>`count(*)::int` })
      .from(slotVotes)
      .where(and(inArray(slotVotes.matchId, ids), eq(slotVotes.userId, actor.user.id)))
      .groupBy(slotVotes.matchId),
  ]);

  return mine
    .map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      capacity: m.capacity,
      isOrganizer: m.organizerId === actor.user.id,
      organizerName: m.organizerName,
      venueName: m.venueName,
      timezone: m.timezone,
      slots: slots.filter((s) => s.matchId === m.id).map(({ startsAt, votes }) => ({ startsAt, votes })),
      participants: counts.find((c) => c.matchId === m.id)?.n ?? 0,
      myVotes: myVotes.find((c) => c.matchId === m.id)?.n ?? 0,
    }))
    .sort((a, b) => (a.slots[0]?.startsAt.getTime() ?? 0) - (b.slots[0]?.startsAt.getTime() ?? 0));
}
