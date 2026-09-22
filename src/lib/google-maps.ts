"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;

// Carga perezosa de Maps JS: solo en las pantallas que lo usan.
export function loadGoogleMaps<T extends keyof google.maps.ImportLibraryMap>(library: T) {
  if (!configured) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local");
    setOptions({ key, v: "weekly", language: "es", region: "AR" });
    configured = true;
  }
  return importLibrary(library);
}

// Los marcadores HTML (AdvancedMarkerElement) exigen un Map ID. DEMO_MAP_ID sirve para desarrollo;
// en producción se crea uno propio en Google Cloud (gratis) y se carga en la variable.
export const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// Rosario: ciudad piloto, centro por defecto de mapas y búsquedas.
export const DEFAULT_CENTER = { lat: -32.9468, lng: -60.6393 };
