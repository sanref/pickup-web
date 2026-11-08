import "server-only";
import type { ApiMe } from "@/lib/api/contract";
import type { Actor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { getProfileStats, listUserSports } from "@/server/services/profiles";

// Respuesta de GET /api/v1/me (y de las escrituras sobre el perfil, que devuelven el perfil nuevo).
export async function meResponse(actor: Actor): Promise<ApiMe> {
  const [sports, stats] = await Promise.all([listUserSports(actor.user.id), getProfileStats(actor.user.id)]);
  const { user, profile } = actor;
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      isAdmin: isAdmin(actor),
    },
    profile: {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      city: profile.city,
      bio: profile.bio,
      onboarded: !!profile.onboardedAt,
    },
    sports,
    stats,
  };
}
