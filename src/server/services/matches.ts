import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import { zonedToUtc } from "@/lib/dates";
import type { CreateMatchInput } from "@/lib/validations/match";
import type { SkillLevel } from "@/lib/validations/profile";
import type { Actor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { db, schema } from "@/server/db/client";
import { UserError } from "@/server/errors";
import { alreadyNotified, notify, type NewNotification } from "./notifications";

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

// — Acceso —

type AccessRow = { id: string; visibility: string; status: MatchStatus; organizerId: string; inviteCode: string };

async function canView(tx: Tx | typeof db, actor: Actor | null, match: AccessRow, invite?: string | null): Promise<boolean> {
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

// Sin sesión se muestra solo el nombre de pila (plan: privacidad de los participantes).
export function publicName(name: string, loggedIn: boolean): string {
  return loggedIn ? name : (name.trim().split(/\s+/)[0] ?? name);
}

// — Lectura —

export type MatchParticipant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  isOrganizer: boolean;
  slotIds: string[];
};

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
  autoConfirm: boolean;
  confirmedSlotId: string | null;
  /** Jugado, o confirmado con el horario ya empezado (el cron que lo marca como jugado llega después). */
  played: boolean;
  sport: { id: number; name: string; slug: string };
  venue: { id: string; name: string; address: string; city: string; timezone: string; location: { lat: number; lng: number } };
  organizer: { userId: string; displayName: string; avatarUrl: string | null };
  slots: { id: string; startsAt: Date; endsAt: Date; votes: number }[];
  /** Orden: confirmados por orden de confirmación, lista de espera por turno, interesados por llegada. */
  participants: MatchParticipant[];
  viewer: {
    userId: string | null;
    isOrganizer: boolean;
    isParticipant: boolean;
    status: ParticipantStatus | null;
    waitlistPosition: number | null;
    slotIds: string[];
  };
};

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
      .orderBy(
        sql`case ${matchParticipants.status} when 'confirmed' then 0 when 'waitlist' then 1 else 2 end`,
        sql`case when ${matchParticipants.status} = 'confirmed' then ${matchParticipants.confirmedAt} else ${matchParticipants.statusChangedAt} end`,
        asc(matchParticipants.joinedAt),
      ),
    db
      .select({ slotId: slotVotes.slotId, userId: slotVotes.userId })
      .from(slotVotes)
      .innerJoin(matchParticipants, and(eq(matchParticipants.matchId, slotVotes.matchId), eq(matchParticipants.userId, slotVotes.userId)))
      .where(and(eq(slotVotes.matchId, id), inArray(matchParticipants.status, ACTIVE_PARTICIPANT))),
  ]);

  const loggedIn = !!actor;
  const viewerId = actor?.user.id ?? null;
  const participants = people.map((p) => ({
    ...p,
    displayName: publicName(p.displayName, loggedIn),
    isOrganizer: p.userId === row.match.organizerId,
    slotIds: votes.filter((v) => v.userId === p.userId).map((v) => v.slotId),
  }));
  const viewerRow = viewerId ? participants.find((p) => p.userId === viewerId) : undefined;
  const waitlist = participants.filter((p) => p.status === "waitlist");
  const position = viewerRow?.status === "waitlist" ? waitlist.findIndex((p) => p.userId === viewerId) + 1 : null;

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
    autoConfirm: row.match.autoConfirm,
    confirmedSlotId: row.match.confirmedSlotId,
    played:
      row.match.status === "played" ||
      (row.match.status === "confirmed" && slots.some((s) => s.id === row.match.confirmedSlotId && s.startsAt.getTime() <= Date.now())),
    sport: row.sport,
    venue: { ...row.venue, location: row.venue.location! },
    organizer: { ...row.organizer, displayName: publicName(row.organizer.displayName, loggedIn) },
    slots: slots.map((s) => ({ ...s, votes: votes.filter((v) => v.slotId === s.id).length })),
    participants,
    viewer: {
      userId: viewerId,
      isOrganizer: viewerId === row.match.organizerId,
      isParticipant: !!viewerRow,
      status: viewerRow?.status ?? null,
      waitlistPosition: position,
      slotIds: viewerRow?.slotIds ?? [],
    },
  };
}

export async function findMatchIdByInvite(code: string): Promise<string | null> {
  const [row] = await db.select({ id: matches.id }).from(matches).where(eq(matches.inviteCode, code));
  return row?.id ?? null;
}

// Para "Gestionar": quién quedaría confirmado y quién en espera con cada opción, por orden de voto.
export type ManageSlot = { id: string; startsAt: Date; voters: { userId: string; displayName: string }[] };

export async function getSlotVoters(matchId: string): Promise<ManageSlot[]> {
  const [slots, voters] = await Promise.all([
    db.select({ id: matchSlots.id, startsAt: matchSlots.startsAt }).from(matchSlots).where(eq(matchSlots.matchId, matchId)).orderBy(asc(matchSlots.startsAt)),
    db
      .select({ slotId: slotVotes.slotId, userId: slotVotes.userId, displayName: profiles.displayName })
      .from(slotVotes)
      .innerJoin(matchParticipants, and(eq(matchParticipants.matchId, slotVotes.matchId), eq(matchParticipants.userId, slotVotes.userId)))
      .innerJoin(profiles, eq(profiles.userId, slotVotes.userId))
      .where(and(eq(slotVotes.matchId, matchId), inArray(matchParticipants.status, ACTIVE_PARTICIPANT)))
      .orderBy(asc(slotVotes.createdAt)),
  ]);
  return slots.map((s) => ({
    ...s,
    voters: voters.filter((v) => v.slotId === s.id).map(({ userId, displayName }) => ({ userId, displayName })),
  }));
}

// — Ciclo de vida (todas las escrituras bloquean la fila del partido: sin sobreinscripción) —

type LockedMatch = AccessRow & { title: string; capacity: number; autoConfirm: boolean; confirmedSlotId: string | null };

async function lockMatch(tx: Tx, actor: Actor, matchId: string, invite?: string | null): Promise<LockedMatch> {
  const [match] = await tx
    .select({
      id: matches.id,
      title: matches.title,
      visibility: matches.visibility,
      status: matches.status,
      organizerId: matches.organizerId,
      inviteCode: matches.inviteCode,
      capacity: matches.capacity,
      autoConfirm: matches.autoConfirm,
      confirmedSlotId: matches.confirmedSlotId,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
  if (!match || !(await canView(tx, actor, match, invite))) throw new UserError("No encontramos el partido.");
  return match;
}

function assertOrganizer(actor: Actor, match: LockedMatch) {
  if (match.organizerId !== actor.user.id && !isAdmin(actor)) throw new UserError("Solo el organizador puede hacer esto.");
}

async function slotStart(tx: Tx, slotId: string | null): Promise<Date | null> {
  if (!slotId) return null;
  const [slot] = await tx.select({ startsAt: matchSlots.startsAt }).from(matchSlots).where(eq(matchSlots.id, slotId));
  return slot?.startsAt ?? null;
}

async function participantStatus(tx: Tx, matchId: string, userId: string): Promise<ParticipantStatus | null> {
  const [row] = await tx
    .select({ status: matchParticipants.status })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId)));
  return row?.status ?? null;
}

async function countConfirmed(tx: Tx, matchId: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.status, "confirmed")));
  return row.n;
}

async function setParticipant(tx: Tx, matchId: string, userId: string, status: ParticipantStatus, at: Date = new Date()) {
  await tx
    .insert(matchParticipants)
    .values({ matchId, userId, status, statusChangedAt: at, confirmedAt: status === "confirmed" ? at : null })
    .onConflictDoUpdate({
      target: [matchParticipants.matchId, matchParticipants.userId],
      set: { status, statusChangedAt: at, confirmedAt: status === "confirmed" ? at : null },
    });
}

// Confirma la opción: los que la votaron entran por orden de voto hasta el cupo y el resto va a la
// lista de espera en ese mismo orden. A los demás anotados se les avisa para que se sumen si queda lugar.
async function confirmInTx(tx: Tx, match: LockedMatch, slotId: string, byUserId: string | null) {
  const voters = await tx
    .select({ userId: slotVotes.userId })
    .from(slotVotes)
    .innerJoin(matchParticipants, and(eq(matchParticipants.matchId, slotVotes.matchId), eq(matchParticipants.userId, slotVotes.userId)))
    .where(and(eq(slotVotes.slotId, slotId), inArray(matchParticipants.status, ACTIVE_PARTICIPANT)))
    .orderBy(asc(slotVotes.createdAt));
  const others = await tx
    .select({ userId: matchParticipants.userId })
    .from(matchParticipants)
    .where(
      and(
        eq(matchParticipants.matchId, match.id),
        inArray(matchParticipants.status, ACTIVE_PARTICIPANT),
        voters.length ? notInArray(matchParticipants.userId, voters.map((v) => v.userId)) : undefined,
      ),
    );

  const base = Date.now();
  const confirmed = voters.slice(0, match.capacity);
  const waitlist = voters.slice(match.capacity);
  // Un milisegundo de diferencia por persona conserva el orden de voto dentro de cada estado.
  for (const [i, v] of confirmed.entries()) await setParticipant(tx, match.id, v.userId, "confirmed", new Date(base + i));
  for (const [i, v] of waitlist.entries()) await setParticipant(tx, match.id, v.userId, "waitlist", new Date(base + i));
  for (const o of others) await setParticipant(tx, match.id, o.userId, "interested", new Date(base));

  await tx
    .update(matches)
    .set({ status: "confirmed", confirmedSlotId: slotId, confirmedAt: new Date(base) })
    .where(eq(matches.id, match.id));

  const payload = { slotId, title: match.title };
  const skip = (userId: string) => userId === byUserId;
  await notify(tx, [
    ...confirmed.filter((v) => !skip(v.userId)).map((v): NewNotification => ({ userId: v.userId, type: "match_confirmed", matchId: match.id, payload })),
    ...waitlist.map((v, i): NewNotification => ({ userId: v.userId, type: "match_waitlisted", matchId: match.id, payload: { ...payload, position: i + 1 } })),
    ...others.filter((o) => !skip(o.userId)).map((o): NewNotification => ({ userId: o.userId, type: "match_confirmed_other_slot", matchId: match.id, payload })),
  ]);
}

// Si una opción llegó al cupo: con confirmación automática se confirma; si no, se le avisa (una vez) al organizador.
async function checkQuorum(tx: Tx, match: LockedMatch) {
  const [full] = await tx
    .select({ slotId: matchSlots.id })
    .from(matchSlots)
    .where(
      and(
        eq(matchSlots.matchId, match.id),
        sql`(select count(*) from ${slotVotes} sv join ${matchParticipants} mp on mp.match_id = sv.match_id and mp.user_id = sv.user_id
             where sv.slot_id = ${matchSlots.id} and mp.status <> 'left') >= ${match.capacity}`,
      ),
    )
    .orderBy(asc(matchSlots.startsAt))
    .limit(1);
  if (!full) return;
  if (match.autoConfirm) {
    await confirmInTx(tx, match, full.slotId, null);
  } else if (!(await alreadyNotified(tx, match.id, "slot_full", "slotId", full.slotId))) {
    await notify(tx, [{ userId: match.organizerId, type: "slot_full", matchId: match.id, payload: { slotId: full.slotId, title: match.title } }]);
  }
}

async function notifyJoined(tx: Tx, match: LockedMatch, actor: Actor, status: ParticipantStatus) {
  if (actor.user.id === match.organizerId) return;
  await notify(tx, [
    { userId: match.organizerId, type: "participant_joined", matchId: match.id, payload: { title: match.title, name: actor.profile.displayName, status } },
  ]);
}

// Sube de la lista de espera (por turno) mientras haya lugar.
async function promoteFromWaitlist(tx: Tx, match: LockedMatch) {
  let free = match.capacity - (await countConfirmed(tx, match.id));
  if (free <= 0) return;
  const next = await tx
    .select({ userId: matchParticipants.userId })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, match.id), eq(matchParticipants.status, "waitlist")))
    .orderBy(asc(matchParticipants.statusChangedAt))
    .limit(free);
  for (const p of next) {
    await setParticipant(tx, match.id, p.userId, "confirmed");
    free--;
  }
  await notify(tx, next.map((p) => ({ userId: p.userId, type: "waitlist_promoted" as const, matchId: match.id, payload: { title: match.title } })));
}

async function assertNotPlayed(tx: Tx, match: LockedMatch) {
  const start = await slotStart(tx, match.confirmedSlotId);
  if (start && start.getTime() <= Date.now()) throw new UserError("Este partido ya se jugó.");
}

// Reemplaza los votos del usuario. Votar lo suma como interesado si todavía no estaba.
export async function setVotes(actor: Actor, matchId: string, slotIds: string[], invite?: string | null) {
  const wanted = [...new Set(slotIds)];
  await db.transaction(async (tx) => {
    const match = await lockMatch(tx, actor, matchId, invite);
    if (match.status !== "open") throw new UserError("La votación de este partido ya cerró.");
    if (wanted.length) {
      const valid = await tx
        .select({ id: matchSlots.id })
        .from(matchSlots)
        .where(and(eq(matchSlots.matchId, matchId), inArray(matchSlots.id, wanted)));
      if (valid.length !== wanted.length) throw new UserError("Ese horario no es de este partido.");
    }
    const before = await participantStatus(tx, matchId, actor.user.id);
    if (!before || before === "left") {
      await setParticipant(tx, matchId, actor.user.id, "interested");
      await notifyJoined(tx, match, actor, "interested");
    }
    await tx
      .delete(slotVotes)
      .where(and(eq(slotVotes.matchId, matchId), eq(slotVotes.userId, actor.user.id), wanted.length ? notInArray(slotVotes.slotId, wanted) : undefined));
    if (wanted.length) {
      await tx
        .insert(slotVotes)
        .values(wanted.map((slotId) => ({ slotId, matchId, userId: actor.user.id })))
        .onConflictDoNothing();
      await checkQuorum(tx, match);
    }
  });
}

// En votación: queda como interesado. Confirmado: entra si hay lugar; si no, a la lista de espera.
export async function joinMatch(actor: Actor, matchId: string, invite?: string | null): Promise<ParticipantStatus> {
  return db.transaction(async (tx) => {
    const match = await lockMatch(tx, actor, matchId, invite);
    const before = await participantStatus(tx, matchId, actor.user.id);
    if (match.status === "open") {
      if (before && before !== "left") return before;
      await setParticipant(tx, matchId, actor.user.id, "interested");
      await notifyJoined(tx, match, actor, "interested");
      return "interested";
    }
    if (match.status !== "confirmed") throw new UserError("Este partido ya no suma gente.");
    await assertNotPlayed(tx, match);
    if (before === "confirmed" || before === "waitlist") return before;
    const status: ParticipantStatus = (await countConfirmed(tx, matchId)) < match.capacity ? "confirmed" : "waitlist";
    await setParticipant(tx, matchId, actor.user.id, status);
    await notifyJoined(tx, match, actor, status);
    return status;
  });
}

async function removeFromMatch(tx: Tx, match: LockedMatch, userId: string) {
  const before = await participantStatus(tx, match.id, userId);
  if (!before || before === "left") return;
  if (match.status === "open") {
    await tx.delete(slotVotes).where(and(eq(slotVotes.matchId, match.id), eq(slotVotes.userId, userId)));
  }
  await tx
    .update(matchParticipants)
    .set({ status: "left", statusChangedAt: sql`now()` })
    .where(and(eq(matchParticipants.matchId, match.id), eq(matchParticipants.userId, userId)));
  if (match.status === "confirmed" && before === "confirmed") await promoteFromWaitlist(tx, match);
}

export async function leaveMatch(actor: Actor, matchId: string) {
  await db.transaction(async (tx) => {
    const match = await lockMatch(tx, actor, matchId);
    if (match.status !== "open" && match.status !== "confirmed") throw new UserError("Este partido ya no admite cambios.");
    if (match.organizerId === actor.user.id) throw new UserError("Sos el organizador: si no se juega, cancelalo desde Gestionar.");
    if (match.status === "confirmed") await assertNotPlayed(tx, match);
    await removeFromMatch(tx, match, actor.user.id);
  });
}

// — Solo organizador —

export async function confirmSlot(actor: Actor, matchId: string, slotId: string) {
  await db.transaction(async (tx) => {
    const match = await lockMatch(tx, actor, matchId);
    assertOrganizer(actor, match);
    if (match.status !== "open") throw new UserError("El partido ya no está en votación.");
    const start = await slotStart(tx, slotId);
    const [slot] = await tx.select({ id: matchSlots.id }).from(matchSlots).where(and(eq(matchSlots.id, slotId), eq(matchSlots.matchId, matchId)));
    if (!slot || !start) throw new UserError("Ese horario no es de este partido.");
    if (start.getTime() <= Date.now()) throw new UserError("Ese horario ya pasó.");
    await confirmInTx(tx, match, slotId, actor.user.id);
  });
}

export async function setAutoConfirm(actor: Actor, matchId: string, value: boolean) {
  await db.transaction(async (tx) => {
    const match = await lockMatch(tx, actor, matchId);
    assertOrganizer(actor, match);
    if (match.status !== "open") throw new UserError("El partido ya no está en votación.");
    await tx.update(matches).set({ autoConfirm: value }).where(eq(matches.id, matchId));
    if (value) await checkQuorum(tx, { ...match, autoConfirm: true });
  });
}

export async function removeParticipant(actor: Actor, matchId: string, userId: string) {
  await db.transaction(async (tx) => {
    const match = await lockMatch(tx, actor, matchId);
    assertOrganizer(actor, match);
    if (userId === match.organizerId) throw new UserError("No te podés sacar a vos mismo.");
    if (match.status !== "open" && match.status !== "confirmed") throw new UserError("Este partido ya no admite cambios.");
    const before = await participantStatus(tx, matchId, userId);
    if (!before || before === "left") return;
    await removeFromMatch(tx, match, userId);
    await notify(tx, [{ userId, type: "removed_from_match", matchId, payload: { title: match.title } }]);
  });
}

export async function cancelMatch(actor: Actor, matchId: string) {
  await db.transaction(async (tx) => {
    const match = await lockMatch(tx, actor, matchId);
    assertOrganizer(actor, match);
    if (match.status !== "open" && match.status !== "confirmed") throw new UserError("Este partido ya no se puede cancelar.");
    await tx.update(matches).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(matches.id, matchId));
    const people = await tx
      .select({ userId: matchParticipants.userId })
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, matchId), inArray(matchParticipants.status, ACTIVE_PARTICIPANT), ne(matchParticipants.userId, match.organizerId)));
    await notify(tx, people.map((p) => ({ userId: p.userId, type: "match_cancelled" as const, matchId, payload: { title: match.title } })));
  });
}

// — Mis partidos —

export type MyMatch = {
  id: string;
  title: string;
  status: MatchStatus;
  capacity: number;
  isOrganizer: boolean;
  myStatus: ParticipantStatus | null;
  waitlistPosition: number | null;
  organizerName: string;
  venueName: string;
  timezone: string;
  pricePerPerson: number | null;
  slots: { startsAt: Date; votes: number }[];
  confirmedStartsAt: Date | null;
  /** Cancelado, jugado o confirmado con el horario ya empezado. */
  isPast: boolean;
  participants: number;
  confirmed: number;
  myVotes: number;
};

export async function listMyMatches(actor: Actor): Promise<MyMatch[]> {
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
      pricePerPerson: matches.pricePerPerson,
      confirmedSlotId: matches.confirmedSlotId,
      myStatus: sql<ParticipantStatus | null>`(select mp.status from ${matchParticipants} mp where mp.match_id = ${matches.id} and mp.user_id = ${actor.user.id})`,
    })
    .from(matches)
    .innerJoin(venues, eq(venues.id, matches.venueId))
    .innerJoin(profiles, eq(profiles.userId, matches.organizerId))
    .where(
      and(
        ne(matches.status, "draft"),
        or(
          eq(matches.organizerId, actor.user.id),
          sql`exists (select 1 from ${matchParticipants} mp where mp.match_id = ${matches.id} and mp.user_id = ${actor.user.id} and mp.status <> 'left')`,
        ),
      ),
    )
    .orderBy(desc(matches.createdAt))
    .limit(200);
  if (mine.length === 0) return [];
  const ids = mine.map((m) => m.id);

  const [slots, counts, myVotes, waitlists] = await Promise.all([
    db
      .select({
        id: matchSlots.id,
        matchId: matchSlots.matchId,
        startsAt: matchSlots.startsAt,
        votes: sql<number>`(select count(*)::int from ${slotVotes} sv join ${matchParticipants} mp on mp.match_id = sv.match_id and mp.user_id = sv.user_id where sv.slot_id = ${matchSlots.id} and mp.status <> 'left')`,
      })
      .from(matchSlots)
      .where(inArray(matchSlots.matchId, ids))
      .orderBy(asc(matchSlots.startsAt)),
    db
      .select({
        matchId: matchParticipants.matchId,
        active: sql<number>`count(*) filter (where ${matchParticipants.status} <> 'left')::int`,
        confirmed: sql<number>`count(*) filter (where ${matchParticipants.status} = 'confirmed')::int`,
      })
      .from(matchParticipants)
      .where(inArray(matchParticipants.matchId, ids))
      .groupBy(matchParticipants.matchId),
    db
      .select({ matchId: slotVotes.matchId, n: sql<number>`count(*)::int` })
      .from(slotVotes)
      .where(and(inArray(slotVotes.matchId, ids), eq(slotVotes.userId, actor.user.id)))
      .groupBy(slotVotes.matchId),
    db
      .select({ matchId: matchParticipants.matchId, userId: matchParticipants.userId })
      .from(matchParticipants)
      .where(and(inArray(matchParticipants.matchId, ids), eq(matchParticipants.status, "waitlist")))
      .orderBy(asc(matchParticipants.statusChangedAt)),
  ]);

  return mine.map((m) => {
    const own = slots.filter((s) => s.matchId === m.id);
    const count = counts.find((c) => c.matchId === m.id);
    const queue = waitlists.filter((w) => w.matchId === m.id);
    const position = queue.findIndex((w) => w.userId === actor.user.id);
    const confirmedStartsAt = own.find((s) => s.id === m.confirmedSlotId)?.startsAt ?? null;
    return {
      id: m.id,
      title: m.title,
      status: m.status,
      capacity: m.capacity,
      isOrganizer: m.organizerId === actor.user.id,
      myStatus: m.myStatus,
      waitlistPosition: position >= 0 ? position + 1 : null,
      organizerName: m.organizerName,
      venueName: m.venueName,
      timezone: m.timezone,
      pricePerPerson: m.pricePerPerson == null ? null : Number(m.pricePerPerson),
      slots: own.map(({ startsAt, votes }) => ({ startsAt, votes })),
      confirmedStartsAt,
      isPast:
        m.status === "cancelled" || m.status === "played" || (m.status === "confirmed" && !!confirmedStartsAt && confirmedStartsAt.getTime() <= Date.now()),
      participants: count?.active ?? 0,
      confirmed: count?.confirmed ?? 0,
      myVotes: myVotes.find((c) => c.matchId === m.id)?.n ?? 0,
    };
  });
}
