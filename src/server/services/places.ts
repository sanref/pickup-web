import "server-only";
import { UserError } from "@/server/errors";

// Google Places (New) por REST, para la app mobile: la web usa la librería JS con una clave de
// navegador restringida por dominio, que desde una app no sirve. Acá se usa GOOGLE_PLACES_API_KEY,
// una clave de servidor (restringida por API a "Places API (New)") que nunca sale del servidor.
// Mismo criterio que la web: sesión de autocompletado (las búsquedas + un detalle se cobran como
// una), sesgo a 30 km del centro y solo Argentina.

const BASE = "https://places.googleapis.com/v1";

export type PlaceSuggestion = { placeId: string; main: string; secondary: string };
export type PickedPlace = { googlePlaceId: string; name: string; address: string; city: string; location: { lat: number; lng: number } };

export class PlacesUnavailableError extends Error {}

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new PlacesUnavailableError("Falta GOOGLE_PLACES_API_KEY");
  return key;
}

async function call<T>(url: string, init: RequestInit & { fieldMask: string }): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey(), "X-Goog-FieldMask": init.fieldMask },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("[places]", response.status, (await response.text()).slice(0, 300));
    throw new UserError("No pudimos buscar en Google Maps. Probá de nuevo en un rato.");
  }
  return (await response.json()) as T;
}

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } };
  }[];
};

export async function autocompletePlaces(input: string, center: { lat: number; lng: number }, sessionToken: string): Promise<PlaceSuggestion[]> {
  const data = await call<AutocompleteResponse>(`${BASE}/places:autocomplete`, {
    method: "POST",
    fieldMask:
      "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["ar"],
      languageCode: "es",
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: 30000 } },
    }),
  });
  return (data.suggestions ?? []).flatMap(({ placePrediction: p }) =>
    p
      ? [{ placeId: p.placeId, main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "", secondary: p.structuredFormat?.secondaryText?.text ?? "" }]
      : [],
  );
}

type PlaceResponse = {
  id: string;
  displayName?: { text: string };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: { longText: string; types: string[] }[];
};

export async function getPlace(placeId: string, sessionToken: string): Promise<PickedPlace> {
  const params = new URLSearchParams({ languageCode: "es", sessionToken });
  const place = await call<PlaceResponse>(`${BASE}/places/${encodeURIComponent(placeId)}?${params}`, {
    method: "GET",
    fieldMask: "id,displayName,shortFormattedAddress,formattedAddress,location,addressComponents",
  });
  if (!place.location) throw new UserError("Ese lugar no tiene ubicación en Google Maps. Elegí otro.");
  const find = (type: string) => place.addressComponents?.find((c) => c.types.includes(type))?.longText;
  const city = find("locality") ?? find("administrative_area_level_2") ?? find("administrative_area_level_1") ?? "";
  const full = place.shortFormattedAddress ?? place.formattedAddress ?? "";
  // La dirección corta de Google termina en ", Rosario": la ciudad ya va aparte (igual que la web).
  const address = city && full.endsWith(`, ${city}`) ? full.slice(0, -(city.length + 2)) : full;
  return {
    googlePlaceId: place.id,
    name: place.displayName?.text ?? "",
    address,
    city,
    location: { lat: place.location.latitude, lng: place.location.longitude },
  };
}
