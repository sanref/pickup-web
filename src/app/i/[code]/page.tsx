import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findMatchIdByInvite } from "@/server/services/matches";

export const metadata: Metadata = { title: "Invitación", robots: { index: false } };

// Link de invitación (para partidos privados): /i/abc123 → el partido, con el código que da acceso.
// Es una página y no un route handler para que un link roto muestre la pantalla de not-found.
export default async function InvitePage({ params }: PageProps<"/i/[code]">) {
  const { code } = await params;
  if (!/^[a-z0-9]{6,40}$/.test(code)) notFound();
  const matchId = await findMatchIdByInvite(code);
  if (!matchId) notFound();
  redirect(`/partidos/${matchId}?invitacion=${code}`);
}
