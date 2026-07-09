"use client";

import { useEffect, useRef, useState } from "react";

type StreetViewPanelProps = {
  apiKey?: string;
  latitude: number | null;
  longitude: number | null;
  title: string;
  open: boolean;
  onClose: () => void;
};

type GoogleMapsApi = {
  maps: {
    StreetViewPanorama: new (
      element: HTMLElement,
      options: Record<string, unknown>
    ) => unknown;
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
    paranoidGoogleMapsPromise?: Promise<GoogleMapsApi>;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = "paranoid-google-maps-js";

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (window.paranoidGoogleMapsPromise) {
    return window.paranoidGoogleMapsPromise;
  }

  window.paranoidGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google?.maps) {
          resolve(window.google);
        } else {
          reject(new Error("Google Maps did not load."));
        }
      });
      existingScript.addEventListener("error", () => {
        reject(new Error("Google Maps failed to load."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps did not load."));
      }
    };
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  return window.paranoidGoogleMapsPromise;
}

export function StreetViewPanel({
  apiKey,
  latitude,
  longitude,
  title,
  open,
  onClose,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (latitude === null || longitude === null) {
      setMessage("Este evento não tem coordenadas.");
      return;
    }

    if (!apiKey) {
      setMessage("Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para ativar Street View.");
      return;
    }

    let cancelled = false;
    setMessage("A abrir Street View...");

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        new google.maps.StreetViewPanorama(containerRef.current, {
          position: { lat: latitude, lng: longitude },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true,
          motionTracking: false,
          motionTrackingControl: true,
          linksControl: true,
          panControl: true,
          showRoadLabels: true,
          zoomControl: true,
        });

        setMessage("");
      })
      .catch(() => {
        setMessage("Não consegui carregar o Street View.");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, latitude, longitude, open]);

  if (!open) {
    return null;
  }

  return (
    <section className="fixed inset-x-3 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] top-20 z-[70] overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-2xl shadow-black/70 backdrop-blur-xl lg:inset-x-auto lg:bottom-8 lg:right-8 lg:top-24 lg:w-[460px]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/75 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
            Street View
          </p>
          <h2 className="truncate text-sm font-black text-[#f2f1ec]">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-[#f2f1ec] px-4 py-2 text-xs font-black text-black"
        >
          Fechar
        </button>
      </div>

      <div className="relative h-[calc(100%-61px)] min-h-80">
        <div ref={containerRef} className="h-full w-full" />
        {message && (
          <div className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center">
            <p className="max-w-xs text-sm font-bold text-zinc-200">{message}</p>
          </div>
        )}
      </div>
    </section>
  );
}
