import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { findMatchIdByInvite } from "@/server/services/matches";

// Link de invitación (para partidos privados): /i/abc123 → el partido, con el código que da acceso.
export async function GET(_request: NextRequest, { params }: RouteContext<"/i/[code]">) {
  const { code } = await params;
  if (!/^[a-z0-9]{6,40}$/.test(code)) notFound();
  const matchId = await findMatchIdByInvite(code);
  if (!matchId) notFound();
  redirect(`/partidos/${matchId}?invitacion=${code}`);
}
