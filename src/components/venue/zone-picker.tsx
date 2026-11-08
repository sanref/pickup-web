"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { locateUser } from "@/lib/user-location";
import { cn } from "@/lib/utils";
import { usePlaceSuggestions } from "./use-place-suggestions";

export type Zone = { label: string; lat: number; lng: number };

const MY_LOCATION_LABEL = "tu ubicación";

// También recuerda la ubicación en la cookie, así el resto del sitio arranca en su ciudad.
async function locate(): Promise<Zone> {
  const { center, city } = await locateUser();
  return { label: city ?? MY_LOCATION_LABEL, ...center };
}

// Zona de búsqueda: "Usar mi ubicación" o un barrio / dirección de Google Maps.
// `current` es la zona vigente; se muestra como placeholder hasta que se escribe otra.
export function ZonePicker({
  current,
  onPick,
  variant = "field",
  id,
}: {
  current: string;
  onPick: (zone: Zone) => void;
  variant?: "field" | "bare";
  id?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [busy, setBusy] = useState(false);
  const { suggestions, failed, fetchPlace, clear } = usePlaceSuggestions(query);

  const typed = query.trim().length >= 3;
  const places = typed ? suggestions : [];
  const count = places.length + 1;

  function close() {
    setOpen(false);
    setQuery("");
    setHighlight(0);
    clear();
  }

  async function choose(index: number) {
    setBusy(true);
    try {
      if (index === 0) {
        onPick(await locate());
      } else {
        const s = places[index - 1];
        const place = await fetchPlace(s, ["location"]);
        if (!place.location) throw new Error("Sin ubicación");
        onPick({ label: s.main, lat: place.location.lat(), lng: place.location.lng() });
      }
      close();
    } catch {
      toast.error(index === 0 ? "No pudimos obtener tu ubicación. Revisá los permisos del navegador." : "No pudimos traer ese lugar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + count) % count);
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      choose(Math.min(highlight, count - 1));
    } else if (e.key === "Escape") {
      close();
    }
  }

  const placeholder = current.charAt(0).toUpperCase() + current.slice(1);

  return (
    <div className="relative w-full">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
        aria-autocomplete="list"
        aria-label={variant === "bare" ? undefined : "Zona"}
        placeholder={placeholder}
        value={query}
        disabled={busy}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={close}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
          if (e.target.value.trim().length < 3) clear();
        }}
        onKeyDown={onKeyDown}
        className={cn(
          variant === "bare" &&
            "h-auto rounded-none border-0 bg-transparent px-0 text-[15px] font-semibold placeholder:text-text hover:border-0 focus-visible:outline-none",
        )}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-30 m-0 mt-2 flex w-[max(100%,280px)] list-none flex-col overflow-hidden rounded-md border border-edge bg-surface p-1.5 shadow-lg"
        >
          <li
            id={`${listId}-0`}
            role="option"
            aria-selected={highlight === 0}
            onMouseEnter={() => setHighlight(0)}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(0);
            }}
            className={cn("flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-semibold", highlight === 0 && "bg-surface-alt")}
          >
            <LocateFixed className="size-4 text-coral-700" aria-hidden />
            Usar mi ubicación
          </li>
          {places.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i + 1}`}
              role="option"
              aria-selected={highlight === i + 1}
              onMouseEnter={() => setHighlight(i + 1)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i + 1);
              }}
              className={cn("flex cursor-pointer items-start gap-2.5 rounded-sm px-3 py-2", highlight === i + 1 && "bg-surface-alt")}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-text-3" aria-hidden />
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{s.main}</span>
                <span className="text-xs text-text-3">{s.secondary}</span>
              </span>
            </li>
          ))}
          {!typed && <li className="px-3 pt-1 pb-1.5 text-xs text-text-3">O escribí un barrio o una dirección.</li>}
          {typed && failed && <li className="px-3 py-1.5 text-xs text-coral-700">No pudimos buscar en Google Maps.</li>}
          {places.length > 0 && (
            <li aria-hidden className="px-3 pt-1 text-right text-[10px] text-text-4">
              Resultados de Google
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
