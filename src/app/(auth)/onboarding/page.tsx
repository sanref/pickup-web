import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext, withNext } from "@/lib/safe-next";
import { requireActor } from "@/server/auth/session";
import { listActiveSports, listUserSports } from "@/server/services/profiles";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Tu perfil" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const next = safeNext((await searchParams).next);
  const { user, profile } = await requireActor(withNext("/onboarding", next));
  if (profile.onboardedAt) redirect(next);

  const [sports, userSports] = await Promise.all([listActiveSports(), listUserSports(user.id)]);

  return (
    <OnboardingWizard
      next={next}
      sports={sports}
      initial={{
        displayName: profile.displayName,
        city: profile.city ?? "",
        bio: profile.bio ?? "",
        sports: userSports,
      }}
    />
  );
}
