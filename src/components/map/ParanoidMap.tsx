"use client";

import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type Marker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";

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
  featured?: boolean;
  frequencyActive?: boolean;
};

type ParanoidMapProps = {
  events: ParanoidMapEvent[];
  userLocation: ParanoidMapUserLocation | null;
  selectedEventId: string | null;
  radiusKm: number | null;
  onSelectEvent: (event: ParanoidMapEvent) => void;
};

const PORTUGAL_CENTER: [number, number] = [-8.0, 39.68];
const WORLD_START_CENTER: [number, number] = [-28, 37];
// MapLibre renders OpenFreeMap's public Liberty style using OpenMapTiles and
// OpenStreetMap data. Attribution is kept visible, no API key is required,
// and the public OpenFreeMap instance has no availability SLA.
const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

type GeoJSONFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
};

function buildCircleFeature(
  center: [number, number],
  radiusKm: number
): GeoJSONFeatureCollection {
  const points = 96;
  const earthRadiusKm = 6371;
  const coordinates: number[][] = [];
  const [longitude, latitude] = center;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const angularDistance = radiusKm / earthRadiusKm;

  for (let index = 0; index <= points; index += 1) {
    const bearing = (index / points) * 2 * Math.PI;
    const pointLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
        Math.cos(latitudeRadians) *
          Math.sin(angularDistance) *
          Math.cos(bearing)
    );
    const pointLongitude =
      longitudeRadians +
      Math.atan2(
        Math.sin(bearing) *
          Math.sin(angularDistance) *
          Math.cos(latitudeRadians),
        Math.cos(angularDistance) -
          Math.sin(latitudeRadians) * Math.sin(pointLatitude)
      );

    coordinates.push([
      (pointLongitude * 180) / Math.PI,
      (pointLatitude * 180) / Math.PI,
    ]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    ],
  };
}

function resizeMapSoon(map: MapLibreMap) {
  window.requestAnimationFrame(() => map.resize());
  window.setTimeout(() => map.resize(), 120);
  window.setTimeout(() => map.resize(), 450);
  window.setTimeout(() => map.resize(), 1100);
}

export function ParanoidMap({
  events,
  userLocation,
  selectedEventId,
  radiusKm,
  onSelectEvent,
}: ParanoidMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const introPlayedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let loadTimeout: number | null = null;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: OPENFREEMAP_STYLE_URL,
        center: WORLD_START_CENTER,
        zoom: 1.05,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        "top-right"
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      // MapLibre starts compact attribution expanded until the first map drag.
      const collapseAttribution = () => {
        const attribution =
          containerRef.current?.querySelector<HTMLDetailsElement>(
            ".maplibregl-ctrl-attrib"
          );
        attribution?.removeAttribute("open");
        attribution?.classList.remove("maplibregl-compact-show");
      };
      collapseAttribution();
      map.on("resize", collapseAttribution);
      map.on("load", () => {
        if (loadTimeout !== null) {
          window.clearTimeout(loadTimeout);
          loadTimeout = null;
        }
        resizeMapSoon(map);
        collapseAttribution();
        setMapError(false);
        setMapReady(true);
      });
      map.on("style.load", () => {
        map.setProjection({ type: "globe" });
        resizeMapSoon(map);
        setStyleReady(true);
      });
      map.on("error", (event) => {
        console.warn("OpenFreeMap map error:", event.error);
      });

      loadTimeout = window.setTimeout(() => {
        if (!map.isStyleLoaded()) {
          setMapError(true);
          setMapReady(false);
        }
      }, 12000);
      resizeMapSoon(map);
    } catch (error) {
      console.warn("OpenFreeMap could not be initialized:", error);
      mapRef.current = null;
      loadTimeout = window.setTimeout(() => setMapError(true), 0);
    }

    return () => {
      if (loadTimeout !== null) {
        window.clearTimeout(loadTimeout);
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      introPlayedRef.current = false;
      setMapReady(false);
      setStyleReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;

    if (!mapReady || !map || !container) {
      return;
    }

    const resize = () => resizeMapSoon(map);
    const observer =
      "ResizeObserver" in window ? new ResizeObserver(resize) : null;

    resize();
    observer?.observe(container);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    window.addEventListener("focus", resize);
    document.addEventListener("visibilitychange", resize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      window.removeEventListener("focus", resize);
      document.removeEventListener("visibilitychange", resize);
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!mapReady || !map || introPlayedRef.current) {
      return;
    }

    introPlayedRef.current = true;

    window.setTimeout(() => {
      map.flyTo({
        center: userLocation
          ? [userLocation.longitude, userLocation.latitude]
          : PORTUGAL_CENTER,
        zoom: userLocation ? 14.8 : 7,
        pitch: userLocation ? 45 : 28,
        bearing: userLocation ? -12 : 0,
        speed: 0.36,
        curve: 1.65,
        essential: true,
      });
    }, 750);
  }, [mapReady, userLocation]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    events.forEach((event) => {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.setAttribute("aria-label", event.title);
      markerElement.dataset.eventId = event.id;
      markerElement.dataset.priority = event.featured ? "3" : event.frequencyActive ? "2" : "1";
      markerElement.className = [
        "map-event-marker",
        event.featured ? "map-event-marker--featured" : "",
        !event.featured && event.frequencyActive ? "map-event-marker--frequency" : "",
      ].filter(Boolean).join(" ");
      markerElement.style.zIndex = markerElement.dataset.priority;

      markerElement.addEventListener("click", () => onSelectEvent(event));

      const marker = new maplibregl.Marker({ element: markerElement })
        .setLngLat([event.longitude, event.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (userLocation) {
      const locationElement = document.createElement("div");
      locationElement.className =
        "h-5 w-5 rounded-full border-2 border-black bg-[#f2f1ec] shadow-[0_0_0_8px_rgba(242,241,236,0.18)]";

      const marker = new maplibregl.Marker({ element: locationElement })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    }

    map.resize();
  }, [events, mapReady, onSelectEvent, userLocation]);

  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const element = marker.getElement();
      if (!element.dataset.eventId) return;
      const selected = element.dataset.eventId === selectedEventId;
      element.classList.toggle("map-event-marker--selected", selected);
      element.style.zIndex = selected ? "20" : element.dataset.priority || "1";
      element.setAttribute("aria-pressed", String(selected));
    });
  }, [selectedEventId]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady || !userLocation || radiusKm === null) {
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([userLocation.longitude, userLocation.latitude]);

    events.forEach((event) => {
      bounds.extend([event.longitude, event.latitude]);
    });

    map.fitBounds(bounds, {
      padding: { top: 120, right: 70, bottom: 260, left: 70 },
      maxZoom: events.length > 0 ? 14.5 : 15.5,
      duration: 700,
    });
  }, [events, mapReady, radiusKm, userLocation]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    const sourceId = "paranoid-radius";
    const fillId = "paranoid-radius-fill";
    const lineId = "paranoid-radius-line";

    if (!userLocation || radiusKm === null) {
      if (map.getLayer(fillId)) {
        map.removeLayer(fillId);
      }
      if (map.getLayer(lineId)) {
        map.removeLayer(lineId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      return;
    }

    const data = buildCircleFeature(
      [userLocation.longitude, userLocation.latitude],
      radiusKm
    );
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;

    if (source) {
      source.setData(data);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data,
      });
    }

    if (!map.getLayer(fillId)) {
      map.addLayer({
        id: fillId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#dc2626",
          "fill-opacity": 0.12,
        },
      });
    }

    if (!map.getLayer(lineId)) {
      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#f2f1ec",
          "line-opacity": 0.8,
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });
    }
  }, [radiusKm, styleReady, userLocation]);

  useEffect(() => {
    if (!selectedEvent || !mapRef.current) {
      return;
    }

    if (userLocation) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([userLocation.longitude, userLocation.latitude]);
      bounds.extend([selectedEvent.longitude, selectedEvent.latitude]);

      mapRef.current.fitBounds(bounds, {
        padding: { top: 130, right: 65, bottom: 260, left: 65 },
        maxZoom: 16,
        duration: 700,
      });
      return;
    }

    mapRef.current.easeTo({
      center: [selectedEvent.longitude, selectedEvent.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 15.5),
      pitch: 45,
      bearing: -12,
      duration: 850,
    });
  }, [selectedEvent, userLocation]);

  return (
    <div className="paranoid-map relative h-full min-h-[520px] w-full bg-black">
      <div ref={containerRef} className="h-full min-h-[520px] w-full" />
      {!mapReady && !mapError ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black text-sm font-bold text-zinc-500">
          A carregar mapa...
        </div>
      ) : null}
      {mapError ? (
        <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center text-sm font-bold text-zinc-400">
          Não foi possível carregar o mapa. Tenta novamente.
        </div>
      ) : null}
    </div>
  );
}
