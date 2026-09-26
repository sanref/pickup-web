"use client";

import { useEffect, useRef, useState } from "react";
import { pinElement } from "@/components/venue/venue-map";
import { GOOGLE_MAP_ID, loadGoogleMaps } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

type LatLng = { lat: number; lng: number };

export type MatchPin = {
  id: string;
  venueId: string;
  lat: number;
  lng: number;
  /** "Jue 20:00" */
  label: string;
  /** "Jue 20:00 · faltan 3", cuando es el pin activo. */
  activeLabel: string;
};

// Navy del sistema: el círculo marca el radio de búsqueda sin competir con los pines coral.
const RADIUS_COLOR = "#122544";

const same = (a: LatLng, b: LatLng) => Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4;

// Mapa de /explorar: un pin por sede (varios partidos en la misma sede comparten pin), el círculo del
// radio de búsqueda y, al arrastrar el mapa, avisa el nuevo centro para volver a buscar.
export function MatchMap({
  center,
  radiusKm,
  pins,
  activeId,
  onPinClick,
  onCenterChange,
  className,
}: {
  center: LatLng;
  radiusKm: number;
  pins: MatchPin[];
  activeId: string | null;
  onPinClick: (venuePins: MatchPin[]) => void;
  onCenterChange: (center: LatLng) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const circle = useRef<google.maps.Circle | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  // Centros que emitió el propio mapa al arrastrarlo: cuando vuelven como prop no hay que reencuadrar.
  const emitted = useRef<LatLng[]>([]);
  const initial = useRef({ center, radiusKm });
  const callbacks = useRef({ onPinClick, onCenterChange });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callbacks.current = { onPinClick, onCenterChange };
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    Promise.all([loadGoogleMaps("maps"), loadGoogleMaps("marker")])
      .then(([{ Map, Circle }]) => {
        if (cancelled || !container.current) return;
        const { center, radiusKm } = initial.current;
        const m = new Map(container.current, {
          center,
          zoom: 12,
          mapId: GOOGLE_MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        circle.current = new Circle({
          map: m,
          center,
          radius: radiusKm * 1000,
          clickable: false,
          strokeColor: RADIUS_COLOR,
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: RADIUS_COLOR,
          fillOpacity: 0.06,
        });
        m.fitBounds(circle.current.getBounds()!, 16);
        // dragend solo lo dispara el usuario (no fitBounds): no hay bucles con los reencuadres propios.
        m.addListener("dragend", () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            const c = m.getCenter();
            if (!c) return;
            const next = { lat: Number(c.lat().toFixed(4)), lng: Number(c.lng().toFixed(4)) };
            emitted.current.push(next);
            callbacks.current.onCenterChange(next);
          }, 400);
        });
        map.current = m;
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Centro o radio nuevos (filtros, zona, atrás del navegador): mover el círculo y encuadrarlo,
  // salvo que el centro sea uno que emitió el mapa al arrastrarlo (el usuario ya lo está mirando).
  const { lat, lng } = center;
  useEffect(() => {
    if (!ready || !map.current || !circle.current) return;
    const next = { lat, lng };
    const own = emitted.current.findIndex((c) => same(c, next));
    emitted.current = own >= 0 ? emitted.current.slice(own + 1) : [];
    const radiusChanged = circle.current.getRadius() !== radiusKm * 1000;
    circle.current.setCenter(next);
    circle.current.setRadius(radiusKm * 1000);
    if (radiusChanged || own < 0) map.current.fitBounds(circle.current.getBounds()!, 16);
  }, [ready, lat, lng, radiusKm]);

  // En mobile el mapa arranca oculto (toggle Lista / Mapa): al mostrarse, encuadrar de nuevo.
  useEffect(() => {
    const el = container.current;
    if (!ready || !el) return;
    let visible = el.offsetWidth > 0;
    const observer = new ResizeObserver(() => {
      const now = el.offsetWidth > 0;
      if (now && !visible && map.current && circle.current) map.current.fitBounds(circle.current.getBounds()!, 16);
      visible = now;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  const drawn = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !map.current) return;
    const key = JSON.stringify([pins, activeId]);
    if (drawn.current === key) return;
    drawn.current = key;
    const byVenue = new Map<string, MatchPin[]>();
    for (const pin of pins) byVenue.set(pin.venueId, [...(byVenue.get(pin.venueId) ?? []), pin]);

    const { AdvancedMarkerElement } = google.maps.marker;
    for (const m of markers.current) m.map = null;
    markers.current = [...byVenue.values()].map((group) => {
      const active = group.find((p) => p.id === activeId);
      const label = active ? active.activeLabel : group.length > 1 ? `${group[0].label} · +${group.length - 1}` : group[0].label;
      const marker = new AdvancedMarkerElement({
        map: map.current,
        position: { lat: group[0].lat, lng: group[0].lng },
        title: label,
        content: pinElement(label, !!active),
        zIndex: active ? 10 : 1,
      });
      marker.addEventListener("gmp-click", () => callbacks.current.onPinClick(group));
      return marker;
    });
  }, [ready, pins, activeId]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-edge bg-map shadow-sm", className)}>
      <div ref={container} className="absolute inset-0" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-text-3">
          No pudimos cargar el mapa.
        </div>
      )}
    </div>
  );
}
