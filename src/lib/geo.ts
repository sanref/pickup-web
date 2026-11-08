// Rosario: ciudad piloto, centro por defecto de mapas y búsquedas.
// Fuera de google-maps.ts (que es de cliente) para poder usarlo también en el servidor.
export const DEFAULT_CENTER = { lat: -32.9468, lng: -60.6393 };
export const DEFAULT_ZONE_LABEL = "Rosario centro";

// Ubicación del usuario recordada en una cookie (la escribe el cliente, la lee el servidor).
// Formato: "lat,lng,ciudad" (ciudad codificada) o "denied" si rechazó el permiso y no hay que volver a pedirlo.
export const LOCATION_COOKIE = "pickup_loc";
export const LOCATION_DENIED = "denied";

export type SavedLocation = { center: { lat: number; lng: number }; city: string | null };

// Con dos decimales (~1 km) alcanza para buscar cerca y la ubicación exacta no se guarda.
export const coarse = (n: number) => Math.round(n * 100) / 100;

export function serializeLocation({ center, city }: SavedLocation): string {
  return [center.lat, center.lng, encodeURIComponent(city ?? "")].join(",");
}

export function parseLocation(raw: string | undefined): SavedLocation | null {
  if (!raw) return null;
  const [lat, lng, city = ""] = raw.split(",");
  const la = Number(lat);
  const ln = Number(lng);
  if (!lat || !lng || !Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  let name: string | null = null;
  try {
    name = decodeURIComponent(city).trim().slice(0, 60) || null;
  } catch {}
  return { center: { lat: la, lng: ln }, city: name };
}
