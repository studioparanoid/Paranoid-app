"use client";

import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationResult } from "@/lib/location/types";

const mapStyle = "https://tiles.openfreemap.org/styles/liberty";

async function resolveMapPoint(latitude: number, longitude: number) {
  const response = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  const result = await response.json() as LocationResult & { error?: string };
  if (!response.ok) throw new Error(result.error || "Não foi possível confirmar o ponto.");
  return result;
}

export function LocationSuggestions({ query, context, onSelect }: { query: string; context?: Record<string, string>; onSelect: (result: LocationResult) => void }) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [message, setMessage] = useState("");
  const venue = context?.venue || "";
  const city = context?.city || "";
  const municipality = context?.municipality || "";
  const district = context?.district || "";
  const postalCode = context?.postal_code || "";

  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setResults([]);
      setMessage("");
      try {
        const response = await fetch("/api/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ query: cleanQuery, suggest: true, venue, city, municipality, district, postal_code: postalCode }) });
        const payload = await response.json() as { results?: LocationResult[]; error?: string };
        if (!response.ok) { setResults([]); setMessage(payload.error || "Sem sugestões. Continua manualmente."); return; }
        setResults(payload.results || []);
        setMessage(payload.results?.length ? "" : "Sem sugestões. Continua manualmente.");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Pesquisa indisponível. Continua manualmente.");
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [city, district, municipality, postalCode, query, venue]);

  if (query.trim().length < 3 || (!results.length && !message)) return null;
  return <div className="relative z-20 mt-2">
    {results.length > 0 ? <ul className="shadow-dropdown max-h-60 overflow-y-auto rounded border border-zinc-700 bg-black p-1" aria-label="Sugestões de localização">{results.map((result) => <li key={`${result.latitude}-${result.longitude}`}><button type="button" onClick={() => { onSelect(result); setResults([]); setMessage(""); }} className="w-full rounded px-3 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-900 focus:bg-zinc-900 focus:outline-none"><strong className="block text-zinc-100">{result.address || result.locality || result.city || "Localização"}</strong><span className="mt-1 block text-xs text-zinc-500">{result.display_name}</span></button></li>)}</ul> : <p className="text-xs text-amber-400">{message}</p>}
  </div>;
}

export function LocationMapPicker({ latitude, longitude, onSelect }: { latitude: number | null; longitude: number | null; onSelect: (result: LocationResult) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const selectRef = useRef(onSelect);
  const initialLocationRef = useRef({ latitude, longitude });
  const [message, setMessage] = useState("Clica no mapa para escolher o ponto exato.");

  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);

  const selectPoint = useCallback(async (nextLatitude: number, nextLongitude: number) => {
    setMessage("A confirmar o ponto...");
    try {
      const result = await resolveMapPoint(nextLatitude, nextLongitude);
      selectRef.current(result);
      setMessage("Ponto selecionado. Podes clicar ou arrastar o marcador para o corrigir.");
    } catch (error) {
      selectRef.current({ latitude: nextLatitude, longitude: nextLongitude, display_name: `${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}` });
      setMessage(error instanceof Error ? `${error.message} As coordenadas foram guardadas.` : "As coordenadas foram guardadas.");
    }
  }, []);

  const placeMarker = useCallback((map: MapLibreMap, nextLatitude: number, nextLongitude: number) => {
    markerRef.current?.remove();
    const marker = new maplibregl.Marker({ color: "#dc2626", draggable: true })
      .setLngLat([nextLongitude, nextLatitude])
      .addTo(map);
    marker.on("dragend", () => {
      const point = marker.getLngLat();
      void selectPoint(point.lat, point.lng);
    });
    markerRef.current = marker;
  }, [selectPoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial = initialLocationRef.current;
    const map = new maplibregl.Map({ container: containerRef.current, style: mapStyle, center: initial.longitude != null && initial.latitude != null ? [initial.longitude, initial.latitude] : [-8, 39.68], zoom: initial.longitude != null && initial.latitude != null ? 15 : 6.2, attributionControl: false });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("click", ({ lngLat }) => {
      placeMarker(map, lngLat.lat, lngLat.lng);
      void selectPoint(lngLat.lat, lngLat.lng);
    });
    mapRef.current = map;
    return () => { markerRef.current?.remove(); map.remove(); mapRef.current = null; };
  }, [placeMarker, selectPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude == null || longitude == null) return;
    const currentPoint = markerRef.current?.getLngLat();
    if (!currentPoint || currentPoint.lat !== latitude || currentPoint.lng !== longitude) {
      placeMarker(map, latitude, longitude);
    }
    map.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 15), duration: 500 });
  }, [latitude, longitude, placeMarker]);

  return <div><div ref={containerRef} className="h-64 w-full overflow-hidden rounded border border-zinc-800 bg-zinc-950" /><p className="mt-2 text-xs text-zinc-500">{message} O marcador também pode ser arrastado.</p></div>;
}
