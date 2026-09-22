"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { DEFAULT_CENTER, loadGoogleMaps } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

export type PickedPlace = {
  googlePlaceId: string;
  name: string;
  address: string;
  city: string;
  location: { lat: number; lng: number };
};

type Suggestion = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction };

function cityOf(components: google.maps.places.AddressComponent[] | null | undefined): string {
  const find = (type: string) => components?.find((c) => c.types.includes(type))?.longText;
  return find("locality") ?? find("administrative_area_level_2") ?? find("administrative_area_level_1") ?? "";
}

// Autocompletar de Places (New). Una sesión = las búsquedas mientras se escribe + un fetchFields al elegir.
export function PlaceSearch({ onPick, center = DEFAULT_CENTER }: { onPick: (place: PickedPlace) => void; center?: { lat: number; lng: number } }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const lastRequest = useRef(0);

  useEffect(() => {
    const input = query.trim();
    if (input.length < 3) return;
    const requestId = ++lastRequest.current;
    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = await loadGoogleMaps("places");
        token.current ??= new AutocompleteSessionToken();
        const { suggestions: found } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: token.current,
          includedRegionCodes: ["ar"],
          locationBias: { center, radius: 30000 },
          language: "es",
        });
        if (requestId !== lastRequest.current) return;
        setSuggestions(
          found.flatMap((s) =>
            s.placePrediction
              ? [{
                  id: s.placePrediction.placeId,
                  main: s.placePrediction.mainText?.text ?? s.placePrediction.text.text,
                  secondary: s.placePrediction.secondaryText?.text ?? "",
                  prediction: s.placePrediction,
                }]
              : [],
          ),
        );
        setHighlight(0);
        setStatus("idle");
      } catch {
        if (requestId === lastRequest.current) setStatus("error");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, center]);

  async function pick(s: Suggestion) {
    setStatus("loading");
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["id", "displayName", "shortFormattedAddress", "formattedAddress", "location", "addressComponents"] });
      token.current = null;
      if (!place.location) throw new Error("Sin ubicación");
      setSuggestions([]);
      setQuery("");
      setStatus("idle");
      const city = cityOf(place.addressComponents);
      const fullAddress = place.shortFormattedAddress ?? place.formattedAddress ?? s.secondary;
      // La dirección corta de Google termina en ", Rosario": la ciudad ya se muestra aparte.
      const address = city && fullAddress.endsWith(`, ${city}`) ? fullAddress.slice(0, -(city.length + 2)) : fullAddress;
      onPick({
        googlePlaceId: place.id,
        name: place.displayName ?? s.main,
        address,
        city,
        location: { lat: place.location.lat(), lng: place.location.lng() },
      });
    } catch {
      setStatus("error");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  const open = suggestions.length > 0 && query.trim().length >= 3;

  return (
    <div className="relative flex flex-col gap-2">
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
        aria-label="Buscar la cancha en Google Maps"
        placeholder="Nombre de la cancha o dirección"
        value={query}
        autoFocus
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 3) setSuggestions([]);
        }}
        onKeyDown={onKeyDown}
      />
      {status === "error" && <span className="text-xs text-accent-700">No pudimos buscar en Google Maps. Probá de nuevo.</span>}
      {status === "loading" && <span className="text-xs text-neutral-700">Trayendo los datos del lugar…</span>}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-20 m-0 mt-1.5 flex w-full list-none flex-col overflow-hidden rounded-md bg-background p-1.5 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              className={cn("flex cursor-pointer flex-col rounded-sm px-3 py-2", i === highlight && "bg-neutral-100")}
            >
              <span className="text-sm font-semibold">{s.main}</span>
              <span className="text-xs text-neutral-700">{s.secondary}</span>
            </li>
          ))}
          <li aria-hidden className="px-3 pt-1 text-right text-[10px] text-neutral-600">
            Resultados de Google
          </li>
        </ul>
      )}
    </div>
  );
}
