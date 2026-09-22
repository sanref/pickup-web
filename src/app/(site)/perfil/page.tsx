import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/profile/user-avatar";
import { auth, requireOnboardedActor } from "@/server/auth/session";
import { getProfileStats, listActiveSports, listUserSports } from "@/server/services/profiles";
import { AccountBlock } from "./account-block";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mi perfil" };

function joinedLabel(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const fmt = new Intl.DateTimeFormat("es-AR", sameYear ? { month: "long" } : { month: "long", year: "numeric" });
  return `se sumó en ${fmt.format(date)}`;
}

export default async function ProfilePage() {
  const { user, profile } = await requireOnboardedActor("/perfil");
  const [sports, userSports, stats, accounts] = await Promise.all([
    listActiveSports(),
    listUserSports(user.id),
    getProfileStats(user.id),
    auth.listAccounts(),
  ]);
  const providers = new Set((accounts.data ?? []).map((a: { providerId: string }) => a.providerId));

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 min-[900px]:grid-cols-[300px_1fr] min-[900px]:px-10">
      <aside className="flex flex-col items-start gap-4">
        <UserAvatar name={profile.displayName} src={profile.avatarUrl} className="size-[132px]" textClassName="text-[44px]" />
        <div className="flex flex-col gap-1">
          <span className="font-heading text-2xl leading-tight">{profile.displayName}</span>
          <span className="text-sm text-neutral-700">
            {[profile.city, joinedLabel(profile.createdAt)].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent-2">
            {stats.played} {stats.played === 1 ? "partido jugado" : "partidos jugados"}
          </Badge>
          <Badge variant="neutral">
            {stats.organized} {stats.organized === 1 ? "organizado" : "organizados"}
          </Badge>
        </div>
      </aside>

      <div className="flex flex-col gap-10">
        <ProfileForm
          sports={sports}
          initial={{
            displayName: profile.displayName,
            city: profile.city ?? "",
            bio: profile.bio ?? "",
            sports: userSports,
          }}
        />
        <AccountBlock
          email={user.email}
          emailVerified={user.emailVerified}
          hasPassword={providers.has("credential")}
          hasGoogle={providers.has("google")}
        />
      </div>
    </div>
  );
}
