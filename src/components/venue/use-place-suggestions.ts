"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER } from "@/lib/geo";
import { loadGoogleMaps } from "@/lib/google-maps";

export type PlaceSuggestion = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction };

// Autocompletar de Places (New). Una sesión = las búsquedas mientras se escribe + un fetchFields al elegir.
export function usePlaceSuggestions(query: string, center: { lat: number; lng: number } = DEFAULT_CENTER) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [failed, setFailed] = useState(false);
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
        setFailed(false);
      } catch {
        if (requestId === lastRequest.current) setFailed(true);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, center]);

  // Trae los datos del lugar elegido y cierra la sesión: la próxima búsqueda arranca otra.
  const fetchPlace = useCallback(async (suggestion: PlaceSuggestion, fields: string[]) => {
    const place = suggestion.prediction.toPlace();
    await place.fetchFields({ fields });
    token.current = null;
    return place;
  }, []);

  const clear = useCallback(() => {
    lastRequest.current++;
    setSuggestions([]);
  }, []);

  return { suggestions, failed, fetchPlace, clear };
}
