import { cookies } from "next/headers";
import { LOCATION_COOKIE, parseLocation, type SavedLocation } from "@/lib/geo";

// Ubicación recordada del usuario, o null si no hay (o no la dio).
// `asked` indica si ya se le pidió permiso alguna vez, para no insistir.
export async function getSavedLocation(): Promise<{ location: SavedLocation | null; asked: boolean }> {
  const raw = (await cookies()).get(LOCATION_COOKIE)?.value;
  return { location: parseLocation(raw), asked: raw !== undefined };
}
