"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { DEFAULT_CENTER } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { usePlaceSuggestions, type PlaceSuggestion } from "./use-place-suggestions";

export type PickedPlace = {
  googlePlaceId: string;
  name: string;
  address: string;
  city: string;
  location: { lat: number; lng: number };
};

function cityOf(components: google.maps.places.AddressComponent[] | null | undefined): string {
  const find = (type: string) => components?.find((c) => c.types.includes(type))?.longText;
  return find("locality") ?? find("administrative_area_level_2") ?? find("administrative_area_level_1") ?? "";
}

// Buscador de la cancha en Google Maps para proponer una sede.
export function PlaceSearch({ onPick, center = DEFAULT_CENTER }: { onPick: (place: PickedPlace) => void; center?: { lat: number; lng: number } }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const { suggestions, failed, fetchPlace, clear } = usePlaceSuggestions(query, center);

  async function pick(s: PlaceSuggestion) {
    setStatus("loading");
    try {
      const place = await fetchPlace(s, ["id", "displayName", "shortFormattedAddress", "formattedAddress", "location", "addressComponents"]);
      if (!place.location) throw new Error("Sin ubicación");
      clear();
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
      clear();
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
          setHighlight(0);
          if (e.target.value.trim().length < 3) clear();
        }}
        onKeyDown={onKeyDown}
      />
      {(status === "error" || failed) && <span className="text-xs text-coral-700">No pudimos buscar en Google Maps. Probá de nuevo.</span>}
      {status === "loading" && <span className="text-xs text-text-3">Trayendo los datos del lugar…</span>}
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
              className={cn("flex cursor-pointer flex-col rounded-sm px-3 py-2", i === highlight && "bg-surface-alt")}
            >
              <span className="text-sm font-semibold">{s.main}</span>
              <span className="text-xs text-text-3">{s.secondary}</span>
            </li>
          ))}
          <li aria-hidden className="px-3 pt-1 text-right text-[10px] text-text-4">
            Resultados de Google
          </li>
        </ul>
      )}
    </div>
  );
}
