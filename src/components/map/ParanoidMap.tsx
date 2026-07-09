"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";

export type ParanoidMapUserLocation = {
  latitude: number;
  longitude: number;
  accuracyKm: number | null;
  label: string;
  source: "manual" | "browser";
};

export type ParanoidMapEvent = {
  id: string;
  slug: string;
  title: string;
  displayDate: string;
  displayTime: string;
  venueName: string;
  cityArea: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
};

type ParanoidMapProps = {
  events: ParanoidMapEvent[];
  userLocation: ParanoidMapUserLocation | null;
  selectedEventId: string | null;
  mapboxToken?: string;
  onSelectEvent: (event: ParanoidMapEvent) => void;
};

const PORTUGAL_CENTER: [number, number] = [-8.2245, 39.3999];

export function ParanoidMap({
  events,
  userLocation,
  selectedEventId,
  mapboxToken,
  onSelectEvent,
}: ParanoidMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: userLocation
        ? [userLocation.longitude, userLocation.latitude]
        : PORTUGAL_CENTER,
      zoom: userLocation ? 11 : 6,
      attributionControl: false,
    });

    mapRef.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, userLocation]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    events.forEach((event) => {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.setAttribute("aria-label", event.title);
      markerElement.className =
        "h-4 w-4 rounded-full border-2 border-[#f2f1ec] bg-red-600 shadow-[0_0_0_6px_rgba(220,38,38,0.2)] transition-transform hover:scale-125";

      if (event.id === selectedEventId) {
        markerElement.className =
          "h-5 w-5 rounded-full border-2 border-white bg-red-500 shadow-[0_0_0_10px_rgba(239,68,68,0.3)]";
      }

      markerElement.addEventListener("click", () => onSelectEvent(event));

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([event.longitude, event.latitude])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([event.longitude, event.latitude]);
    });

    if (userLocation) {
      const locationElement = document.createElement("div");
      locationElement.className =
        "h-5 w-5 rounded-full border-2 border-black bg-[#f2f1ec] shadow-[0_0_0_8px_rgba(242,241,236,0.18)]";

      const marker = new mapboxgl.Marker({ element: locationElement })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([userLocation.longitude, userLocation.latitude]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 96, right: 64, bottom: 180, left: 64 },
        maxZoom: 13,
        duration: 800,
      });
    }

    map.resize();
  }, [events, onSelectEvent, selectedEventId, userLocation]);

  useEffect(() => {
    if (!selectedEvent || !mapRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: [selectedEvent.longitude, selectedEvent.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 12),
      duration: 500,
    });
  }, [selectedEvent]);

  if (!mapboxToken) {
    return (
      <div className="relative h-full min-h-[520px] overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.22),transparent_35%),linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:100%_100%,48px_48px,48px_48px]" />
        <div className="absolute inset-x-4 top-24 rounded-2xl border border-red-900/60 bg-black/80 p-4 backdrop-blur lg:left-8 lg:right-auto lg:max-w-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            Mapa em espera
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Adiciona NEXT_PUBLIC_MAPBOX_TOKEN para ativar o mapa escuro. Os
            eventos continuam disponíveis na lista.
          </p>
        </div>
        {events.slice(0, 24).map((event, index) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event)}
            className="absolute h-4 w-4 rounded-full border-2 border-[#f2f1ec] bg-red-600"
            style={{
              left: `${12 + ((index * 29) % 76)}%`,
              top: `${18 + ((index * 17) % 58)}%`,
            }}
            aria-label={event.title}
          />
        ))}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[520px] w-full" />;
}
