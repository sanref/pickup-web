"use client";

import { LOCATION_COOKIE, LOCATION_DENIED, coarse, serializeLocation, type SavedLocation } from "@/lib/geo";
import { loadGoogleMaps } from "@/lib/google-maps";

function writeCookie(value: string, maxAge: number) {
  document.cookie = `${LOCATION_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function markLocationDenied() {
  writeCookie(LOCATION_DENIED, 60 * 60 * 24 * 7);
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Sin geolocalización"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 });
  });
}

// Nombre de la ciudad con el Geocoder de Maps. Si la API no está habilitada o falla, se sigue sin nombre.
async function cityOf(center: SavedLocation["center"]): Promise<string | null> {
  try {
    const { Geocoder } = await loadGoogleMaps("geocoding");
    const { results } = await Promise.race([
      new Geocoder().geocode({ location: center }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    for (const type of ["locality", "administrative_area_level_2"]) {
      const found = results.flatMap((r) => r.address_components).find((c) => c.types.includes(type));
      if (found) return found.long_name;
    }
  } catch {}
  return null;
}

// Pide la ubicación al navegador, la recuerda en una cookie y devuelve centro + ciudad.
export async function locateUser(): Promise<SavedLocation> {
  const pos = await position();
  const center = { lat: coarse(pos.coords.latitude), lng: coarse(pos.coords.longitude) };
  const saved = { center, city: await cityOf(center) };
  writeCookie(serializeLocation(saved), 60 * 60 * 24 * 365);
  return saved;
}
