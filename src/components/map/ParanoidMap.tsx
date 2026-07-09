"use client";

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
};

type ParanoidMapProps = {
  events: ParanoidMapEvent[];
  userLocation: ParanoidMapUserLocation | null;
  selectedEventId: string | null;
  radiusKm: number | null;
  mapboxToken?: string;
  onSelectEvent: (event: ParanoidMapEvent) => void;
};

const PORTUGAL_CENTER: [number, number] = [-8.2245, 39.3999];
const MAPBOX_GL_SCRIPT_ID = "paranoid-mapbox-gl-js";
const MAPBOX_GL_CSS_ID = "paranoid-mapbox-gl-css";
const MAPBOX_GL_VERSION = "v3.10.0";

type MapboxGlApi = {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMap;
  Marker: new (options?: Record<string, unknown>) => MapboxMarker;
  LngLatBounds: new () => MapboxBounds;
  AttributionControl: new (options?: Record<string, unknown>) => unknown;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
};

type MapboxMap = {
  addControl: (control: unknown, position?: string) => void;
  remove: () => void;
  resize: () => void;
  flyTo: (options: Record<string, unknown>) => void;
  easeTo: (options: Record<string, unknown>) => void;
  getZoom: () => number;
  on: (event: string, handler: () => void) => void;
  isStyleLoaded: () => boolean;
  addSource: (id: string, source: Record<string, unknown>) => void;
  getSource: (id: string) => MapboxGeoJsonSource | undefined;
  removeSource: (id: string) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  getLayer: (id: string) => unknown;
  removeLayer: (id: string) => void;
};

type MapboxMarker = {
  setLngLat: (coordinates: [number, number]) => MapboxMarker;
  addTo: (map: MapboxMap) => MapboxMarker;
  remove: () => void;
};

type MapboxBounds = {
  extend: (coordinates: [number, number]) => MapboxBounds;
  isEmpty: () => boolean;
};

type MapboxGeoJsonSource = {
  setData: (data: GeoJSONFeatureCollection) => void;
};

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

declare global {
  interface Window {
    mapboxgl?: MapboxGlApi;
    paranoidMapboxGlPromise?: Promise<MapboxGlApi>;
  }
}

function loadMapboxGl() {
  if (window.mapboxgl) {
    return Promise.resolve(window.mapboxgl);
  }

  if (window.paranoidMapboxGlPromise) {
    return window.paranoidMapboxGlPromise;
  }

  window.paranoidMapboxGlPromise = new Promise((resolve, reject) => {
    if (!document.getElementById(MAPBOX_GL_CSS_ID)) {
      const link = document.createElement("link");
      link.id = MAPBOX_GL_CSS_ID;
      link.rel = "stylesheet";
      link.href = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_GL_VERSION}/mapbox-gl.css`;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(
      MAPBOX_GL_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.mapboxgl) {
          resolve(window.mapboxgl);
        } else {
          reject(new Error("Mapbox GL did not load."));
        }
      });
      existingScript.addEventListener("error", () => {
        reject(new Error("Mapbox GL failed to load."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = MAPBOX_GL_SCRIPT_ID;
    script.src = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_GL_VERSION}/mapbox-gl.js`;
    script.async = true;
    script.onload = () => {
      if (window.mapboxgl) {
        resolve(window.mapboxgl);
      } else {
        reject(new Error("Mapbox GL did not load."));
      }
    };
    script.onerror = () => reject(new Error("Mapbox GL failed to load."));
    document.head.appendChild(script);
  });

  return window.paranoidMapboxGlPromise;
}

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

export function ParanoidMap({
  events,
  userLocation,
  selectedEventId,
  radiusKm,
  mapboxToken,
  onSelectEvent,
}: ParanoidMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<MapboxGlApi | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const introPlayedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [styleReady, setStyleReady] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    loadMapboxGl()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current || mapRef.current) {
          return;
        }

        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = mapboxToken;

        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [0, 20],
          zoom: 1.4,
          pitch: 0,
          bearing: 0,
          attributionControl: false,
        });

        mapRef.current.addControl(
          new mapboxgl.NavigationControl({ showCompass: true }),
          "top-right"
        );
        mapRef.current.addControl(
          new mapboxgl.AttributionControl({ compact: true }),
          "bottom-right"
        );
        mapRef.current.on("load", () => setStyleReady(true));
        setMapReady(true);
      })
      .catch(() => {
        mapRef.current = null;
        setMapReady(false);
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      introPlayedRef.current = false;
      setMapReady(false);
      setStyleReady(false);
    };
  }, [mapboxToken]);

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
        zoom: userLocation ? 12 : 6,
        pitch: 0,
        bearing: 0,
        speed: 0.65,
        curve: 1.45,
        essential: true,
      });
    }, 550);
  }, [mapReady, userLocation]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }
    const mapboxgl = mapboxRef.current;

    if (!mapboxgl) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

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
    });

    if (userLocation) {
      const locationElement = document.createElement("div");
      locationElement.className =
        "h-5 w-5 rounded-full border-2 border-black bg-[#f2f1ec] shadow-[0_0_0_8px_rgba(242,241,236,0.18)]";

      const marker = new mapboxgl.Marker({ element: locationElement })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    }

    map.resize();
  }, [events, mapReady, onSelectEvent, selectedEventId, userLocation]);

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
    const source = map.getSource(sourceId);

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

    mapRef.current.easeTo({
      center: [selectedEvent.longitude, selectedEvent.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 12),
      pitch: 0,
      bearing: 0,
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
