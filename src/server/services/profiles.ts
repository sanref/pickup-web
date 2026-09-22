import "server-only";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import type { OnboardingInput, ProfileInput, SkillLevel } from "@/lib/validations/profile";

const { profiles, sports, userSports } = schema;

export type Profile = typeof profiles.$inferSelect;
export type Sport = Pick<typeof sports.$inferSelect, "id" | "slug" | "name" | "defaultCapacity">;
export type UserSport = { sportId: number; level: SkillLevel };

type AuthUser = { id: string; name: string | null; image?: string | null };

// Idempotente: crea el perfil la primera vez que el usuario entra, con el nombre y el avatar
// que traiga la cuenta (Google o el nombre del registro).
export async function ensureProfile(user: AuthUser): Promise<Profile> {
  const displayName = (user.name ?? "").trim().slice(0, 60) || "Jugador";
  await db
    .insert(profiles)
    .values({ userId: user.id, displayName, avatarUrl: user.image ?? null })
    .onConflictDoNothing({ target: profiles.userId });
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  return profile;
}

export async function listActiveSports(): Promise<Sport[]> {
  return db
    .select({ id: sports.id, slug: sports.slug, name: sports.name, defaultCapacity: sports.defaultCapacity })
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(asc(sports.sortOrder), asc(sports.name));
}

export async function listUserSports(userId: string): Promise<UserSport[]> {
  return db
    .select({ sportId: userSports.sportId, level: userSports.level })
    .from(userSports)
    .where(eq(userSports.userId, userId));
}

async function replaceUserSports(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  items: UserSport[],
) {
  const ids = items.map((s) => s.sportId);
  await tx
    .delete(userSports)
    .where(ids.length ? and(eq(userSports.userId, userId), notInArray(userSports.sportId, ids)) : eq(userSports.userId, userId));
  if (items.length === 0) return;
  const active = await tx.select({ id: sports.id }).from(sports).where(and(inArray(sports.id, ids), eq(sports.isActive, true)));
  if (active.length !== ids.length) throw new Error("Deporte inválido");
  await tx
    .insert(userSports)
    .values(items.map((s) => ({ userId, sportId: s.sportId, level: s.level })))
    .onConflictDoUpdate({
      target: [userSports.userId, userSports.sportId],
      set: { level: sql`excluded.level` },
    });
}

export async function completeOnboarding(userId: string, input: OnboardingInput) {
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        displayName: input.displayName,
        city: input.city,
        bio: input.bio || null,
        onboardedAt: sql`coalesce(${profiles.onboardedAt}, now())`,
      })
      .where(eq(profiles.userId, userId));
    await replaceUserSports(tx, userId, input.sports);
  });
}

export async function updateProfile(userId: string, input: ProfileInput) {
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ displayName: input.displayName, city: input.city, bio: input.bio || null })
      .where(eq(profiles.userId, userId));
    await replaceUserSports(tx, userId, input.sports);
  });
}

export async function getProfileStats(userId: string): Promise<{ played: number; organized: number }> {
  const { matches, matchParticipants } = schema;
  const [played] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.id, matchParticipants.matchId))
    .where(and(eq(matchParticipants.userId, userId), eq(matchParticipants.status, "confirmed"), eq(matches.status, "played")));
  const [organized] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(matches)
    .where(and(eq(matches.organizerId, userId), notInArray(matches.status, ["draft", "cancelled"])));
  return { played: played.n, organized: organized.n };
}
