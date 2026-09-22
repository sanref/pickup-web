"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_CENTER, GOOGLE_MAP_ID, loadGoogleMaps } from "@/lib/google-maps";

export type MapPin = { id: string; lat: number; lng: number; label: string };

// Pin del handoff: píldora con el texto y un punto debajo. Activo = terracota; inactivo = surface con punto salvia.
function pinElement(label: string, active: boolean): HTMLElement {
  const root = document.createElement("div");
  root.className = "flex flex-col items-center gap-1";
  const pill = document.createElement("div");
  pill.className = cn(
    "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-md transition-colors duration-150",
    active ? "bg-accent text-background" : "bg-surface text-foreground",
  );
  pill.textContent = label;
  const dot = document.createElement("div");
  dot.className = cn("size-3 rounded-full border-[3px] border-background", active ? "bg-accent" : "bg-accent-2");
  root.append(pill, dot);
  return root;
}

export function VenueMap({
  pins,
  activeId,
  onPinClick,
  className,
  zoom = 13,
}: {
  pins: MapPin[];
  activeId?: string | null;
  onPinClick?: (id: string) => void;
  className?: string;
  zoom?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadGoogleMaps("maps"), loadGoogleMaps("marker")])
      .then(([{ Map }]) => {
        if (cancelled || !container.current) return;
        map.current = new Map(container.current, {
          center: DEFAULT_CENTER,
          zoom,
          mapId: GOOGLE_MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [zoom]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const { AdvancedMarkerElement } = google.maps.marker;
    for (const m of markers.current) m.map = null;
    markers.current = pins.map((pin) => {
      const marker = new AdvancedMarkerElement({
        map: map.current,
        position: { lat: pin.lat, lng: pin.lng },
        title: pin.label,
        content: pinElement(pin.label, pin.id === activeId),
        zIndex: pin.id === activeId ? 10 : 1,
      });
      if (onPinClick) marker.addListener("gmp-click", () => onPinClick(pin.id));
      return marker;
    });

    if (pins.length === 1) {
      map.current.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      map.current.setZoom(15);
    } else if (pins.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      for (const p of pins) bounds.extend({ lat: p.lat, lng: p.lng });
      map.current.fitBounds(bounds, 48);
    }
  }, [ready, pins, activeId, onPinClick]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-neutral-200", className)}>
      <div ref={container} className="absolute inset-0" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-700">
          No pudimos cargar el mapa.
        </div>
      )}
    </div>
  );
}
