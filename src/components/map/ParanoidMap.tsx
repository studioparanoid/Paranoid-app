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
const WORLD_START_CENTER: [number, number] = [-28, 37];
const MAPBOX_GL_SCRIPT_ID = "paranoid-mapbox-gl-js";
const MAPBOX_GL_CSS_ID = "paranoid-mapbox-gl-css";
const MAPBOX_GL_VERSION = "v3.10.0";

const PUBLIC_SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
    labels: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#050505",
      },
    },
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
      paint: {
        "raster-saturation": 0.1,
        "raster-contrast": 0.08,
      },
    },
    {
      id: "labels",
      type: "raster",
      source: "labels",
      paint: {
        "raster-opacity": 0.92,
      },
    },
  ],
};

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
  setProjection: (projection: string | Record<string, unknown>) => void;
  setFog: (fog: Record<string, unknown>) => void;
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
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    loadMapboxGl()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current || mapRef.current) {
          return;
        }

        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = mapboxToken || "";

        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: PUBLIC_SATELLITE_STYLE,
          center: WORLD_START_CENTER,
          zoom: 1.05,
          pitch: 0,
          bearing: 0,
          projection: "globe",
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
        mapRef.current.on("style.load", () => {
          const map = mapRef.current;

          if (!map) {
            return;
          }

          map.setProjection("globe");
          map.setFog({
            color: "rgb(8, 12, 20)",
            "high-color": "rgb(35, 65, 120)",
            "horizon-blend": 0.08,
            "space-color": "rgb(0, 0, 0)",
            "star-intensity": 0.35,
          });

          setStyleReady(true);
        });
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
      zoom: Math.max(mapRef.current.getZoom(), 15.5),
      pitch: 45,
      bearing: -12,
      duration: 850,
    });
  }, [selectedEvent]);

  return <div ref={containerRef} className="h-full min-h-[520px] w-full" />;
}
