"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_CATEGORIES,
  ALL_CITIES,
  ALL_DISTRICTS,
  ALL_MUNICIPALITIES,
  buildEventFilterIndex,
  type EventDateFilter,
  type EventPriceFilter,
  filterIndexedEvents,
  getCategoryOptionsForIndexedEvents,
  normalizeEventText,
} from "@/lib/eventFilters";
import {
  getCanonicalDistrict,
  getCanonicalMunicipality,
} from "@/lib/portugalLocations";
import {
  ParanoidMap,
  type ParanoidMapEvent,
  type ParanoidMapUserLocation,
} from "@/components/map/ParanoidMap";
import { StreetViewPanel } from "@/components/map/StreetViewPanel";
import { supabase } from "@/lib/supabase/public";

type RadiusFilter = `${number}` | "all";

type UserLocation = ParanoidMapUserLocation;

type SavedManualLocation = UserLocation & {
  query: string;
  source: "manual";
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

const LOCATION_RADIUS_BUFFER_KM = 0.75;
const SAVED_MANUAL_LOCATION_KEY = "paranoid.map.manualLocation";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  municipality: string | null;
  district: string | null;
  address: string | null;
  postal_code: string | null;
  description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  city: string | null;
  municipality: string | null;
  district: string | null;
  address: string | null;
  postal_code: string | null;
  venue_id: string | null;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  start_at: string | null;
  start_date: string | null;
  end_date: string | null;
  is_multi_day: boolean | null;
  category: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  ticket_mode: string | null;
  ticket_price: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

type EventWithLocation = EventRow & {
  venue: VenueRow | null;
  finalLatitude: number | null;
  finalLongitude: number | null;
  distanceKm: number | null;
  locationLabel: string;
};

type GeocodeResponse = {
  latitude?: number;
  longitude?: number;
  display_name?: string;
  error?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Data por definir";
  }

  const cleanValue = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const cleanValue = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function eventDateValue(event: EventRow) {
  return event.start_at || event.start_date || event.display_date || "";
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInKm(first: Coordinate, second: Coordinate) {
  const earthRadiusKm = 6371;
  const latitudeDistance = toRadians(second.latitude - first.latitude);
  const longitudeDistance = toRadians(second.longitude - first.longitude);
  const startLatitude = toRadians(first.latitude);
  const endLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDistance / 2) *
      Math.sin(longitudeDistance / 2);

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusKm * angularDistance;
}

function formatDistance(value: number | null) {
  if (value === null) {
    return "Sem distância";
  }

  if (value < 1) {
    return `${Math.round(value * 1000)} m`;
  }

  return `${value.toFixed(1)} km`;
}

function normalizeCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function resolveCoordinates({
  latitude,
  longitude,
}: {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
}) {
  const parsedLatitude = normalizeCoordinate(latitude);
  const parsedLongitude = normalizeCoordinate(longitude);

  if (parsedLatitude === null || parsedLongitude === null) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  const looksSwapped =
    parsedLatitude >= -10 &&
    parsedLatitude <= -5 &&
    parsedLongitude >= 32 &&
    parsedLongitude <= 43;

  return {
    latitude: looksSwapped ? parsedLongitude : parsedLatitude,
    longitude: looksSwapped ? parsedLatitude : parsedLongitude,
  };
}

function buildGoogleMapsUrl(
  latitude: number | null,
  longitude: number | null,
  label: string
) {
  if (latitude !== null && longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    label
  )}`;
}

function sortEvents(first: EventWithLocation, second: EventWithLocation) {
  if (first.distanceKm !== null && second.distanceKm !== null) {
    if (first.distanceKm !== second.distanceKm) {
      return first.distanceKm - second.distanceKm;
    }
  }

  if (first.distanceKm !== null && second.distanceKm === null) {
    return -1;
  }

  if (first.distanceKm === null && second.distanceKm !== null) {
    return 1;
  }

  const firstDate = eventDateValue(first);
  const secondDate = eventDateValue(second);

  if (!firstDate && !secondDate) {
    return first.title.localeCompare(second.title, "pt-PT");
  }

  if (!firstDate) {
    return 1;
  }

  if (!secondDate) {
    return -1;
  }

  return new Date(firstDate).getTime() - new Date(secondDate).getTime();
}

function getEventDistrict(event: EventWithLocation) {
  return (
    getCanonicalDistrict(event.district) ||
    getCanonicalDistrict(event.venue?.district) ||
    event.district?.trim() ||
    event.venue?.district?.trim() ||
    ""
  );
}

function getEventMunicipality(event: EventWithLocation) {
  const district = getEventDistrict(event);

  const explicitMunicipality =
    getCanonicalMunicipality(event.municipality, district) ||
    getCanonicalMunicipality(event.venue?.municipality, district) ||
    event.municipality?.trim() ||
    event.venue?.municipality?.trim() ||
    "";

  if (explicitMunicipality) {
    return explicitMunicipality;
  }

  return (
    getCanonicalMunicipality(event.city, district) ||
    getCanonicalMunicipality(event.venue?.city, district)
  );
}

function getEventCity(event: EventWithLocation) {
  return event.city?.trim() || event.venue?.city?.trim() || "";
}

function eventDisplayDate(event: EventWithLocation) {
  const date = event.display_date || formatDate(event.start_at || event.start_date);

  if (event.is_multi_day && event.end_date) {
    return `${date} - ${formatShortDate(event.end_date)}`;
  }

  return date;
}

function EventSummary({
  event,
  selected,
  onSelect,
}: {
  event: EventWithLocation;
  selected: boolean;
  onSelect: () => void;
}) {
  const cityArea = [getEventCity(event), getEventMunicipality(event)]
    .filter(Boolean)
    .join(" / ");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
        selected
          ? "border-red-500 bg-red-950/40"
          : "border-white/10 bg-black/55 hover:border-white/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
            {eventDisplayDate(event)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-[#f2f1ec]">
            {event.title}
          </h3>
        </div>
        <span className="whitespace-nowrap rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-zinc-200">
          {formatDistance(event.distanceKm)}
        </span>
      </div>

      <p className="mt-2 truncate text-xs font-bold text-zinc-300">
        {event.venue_name || event.venue?.name || "Sem espaco"}
      </p>
      <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-zinc-500">
        {cityArea || getEventDistrict(event) || "Sem zona"}
      </p>
      {event.finalLatitude === null || event.finalLongitude === null ? (
        <p className="mt-2 text-[10px] font-bold uppercase text-zinc-500">
          Sem coordenadas
        </p>
      ) : null}
    </button>
  );
}

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [savedManualLocation, setSavedManualLocation] =
    useState<SavedManualLocation | null>(null);
  const [manualLocationQuery, setManualLocationQuery] = useState("");

  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>("50");
  const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS);
  const [municipalityFilter, setMunicipalityFilter] =
    useState(ALL_MUNICIPALITIES);
  const [cityFilter, setCityFilter] = useState(ALL_CITIES);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const dateFilter: EventDateFilter = "all";
  const priceFilter: EventPriceFilter = "all";
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  const lastScrollY = useRef(0);

  const venueById = useMemo(() => {
    const map = new Map<string, VenueRow>();

    venues.forEach((venue) => {
      map.set(venue.id, venue);
    });

    return map;
  }, [venues]);

  const venueByName = useMemo(() => {
    const map = new Map<string, VenueRow>();

    venues.forEach((venue) => {
      map.set(normalizeEventText(venue.name), venue);
    });

    return map;
  }, [venues]);

  const eventsWithLocation = useMemo<EventWithLocation[]>(() => {
    return events.map((event) => {
      const venue =
        (event.venue_id ? venueById.get(event.venue_id) || null : null) ||
        venueByName.get(normalizeEventText(event.venue_name)) ||
        null;

      const eventCoordinates = resolveCoordinates({
        latitude: event.latitude,
        longitude: event.longitude,
      });
      const venueCoordinates = resolveCoordinates({
        latitude: venue?.latitude,
        longitude: venue?.longitude,
      });
      const finalLatitude = eventCoordinates.latitude ?? venueCoordinates.latitude;
      const finalLongitude =
        eventCoordinates.longitude ?? venueCoordinates.longitude;
      const hasCoordinates = finalLatitude !== null && finalLongitude !== null;

      const distanceKm =
        userLocation && hasCoordinates
          ? distanceInKm(userLocation, {
              latitude: finalLatitude,
              longitude: finalLongitude,
            })
          : null;

      const locationLabel = [
        event.venue_name || venue?.name || "",
        event.address || venue?.address || "",
        event.postal_code || venue?.postal_code || "",
        event.city || venue?.city || "",
        event.municipality || venue?.municipality || "",
        event.district || venue?.district || "",
        "Portugal",
      ]
        .filter(Boolean)
        .join(", ");

      return {
        ...event,
        venue,
        finalLatitude,
        finalLongitude,
        distanceKm,
        locationLabel,
      };
    });
  }, [events, venueById, venueByName, userLocation]);

  const indexedEvents = useMemo(() => {
    return eventsWithLocation.map((event) =>
      buildEventFilterIndex(event, {
        getDistrict: getEventDistrict,
        getMunicipality: getEventMunicipality,
        getCity: getEventCity,
        extraSearchText: (event) => [
          event.venue?.name,
          event.venue?.address,
          event.venue?.postal_code,
          event.venue?.city,
          event.venue?.municipality,
          event.venue?.district,
        ],
      })
    );
  }, [eventsWithLocation]);

  const categoryOptions = useMemo(() => {
    return getCategoryOptionsForIndexedEvents(indexedEvents);
  }, [indexedEvents]);

  const filteredEvents = useMemo(() => {
    const radiusLimit =
      userLocation && radiusFilter !== "all"
        ? Number(radiusFilter) +
          Math.max(LOCATION_RADIUS_BUFFER_KM, userLocation.accuracyKm || 0)
        : null;

    return filterIndexedEvents(indexedEvents, {
      searchQuery: "",
      districtFilter,
      municipalityFilter,
      cityFilter,
      categoryFilter,
      dateFilter,
      priceFilter,
    })
      .map((indexedEvent) => indexedEvent.event)
      .filter((event) => {
        const hasCoordinates =
          event.finalLatitude !== null && event.finalLongitude !== null;

        if (userLocation && radiusFilter !== "all" && !hasCoordinates) {
          return false;
        }

        if (userLocation && radiusFilter !== "all") {
          if (event.distanceKm === null) {
            return false;
          }

          return radiusLimit !== null && event.distanceKm <= radiusLimit;
        }

        return true;
      })
      .sort(sortEvents);
  }, [
    indexedEvents,
    radiusFilter,
    districtFilter,
    municipalityFilter,
    cityFilter,
    categoryFilter,
    userLocation,
  ]);

  const pinEvents = useMemo<ParanoidMapEvent[]>(() => {
    return filteredEvents
      .filter(
        (event) => event.finalLatitude !== null && event.finalLongitude !== null
      )
      .map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        displayDate: eventDisplayDate(event),
        displayTime: event.display_time || "Hora por definir",
        venueName: event.venue_name || event.venue?.name || "Sem espaco",
        cityArea:
          [getEventCity(event), getEventMunicipality(event)]
            .filter(Boolean)
            .join(" / ") ||
          getEventDistrict(event) ||
          "Sem zona",
        latitude: event.finalLatitude as number,
        longitude: event.finalLongitude as number,
        distanceKm: event.distanceKm,
      }));
  }, [filteredEvents]);

  const selectedEvent = useMemo(() => {
    return (
      filteredEvents.find((event) => event.id === selectedEventId) ||
      filteredEvents[0] ||
      null
    );
  }, [filteredEvents, selectedEventId]);

  const selectedMapsUrl = selectedEvent
    ? buildGoogleMapsUrl(
        selectedEvent.finalLatitude,
        selectedEvent.finalLongitude,
        selectedEvent.locationLabel
      )
    : "#";

  const selectedEventIndex = selectedEvent
    ? filteredEvents.findIndex((event) => event.id === selectedEvent.id)
    : -1;

  function selectRelativeEvent(direction: -1 | 1) {
    if (filteredEvents.length === 0) {
      return;
    }

    const currentIndex = selectedEventIndex >= 0 ? selectedEventIndex : 0;
    const nextIndex =
      (currentIndex + direction + filteredEvents.length) % filteredEvents.length;

    setSelectedEventId(filteredEvents[nextIndex].id);
  }

  async function loadMapData() {
    setLoading(true);
    setMessage("");

    const [eventsResponse, venuesResponse] = await Promise.all([
      supabase
        .from("events")
        .select(
          "id,slug,title,status,city,municipality,district,address,postal_code,venue_id,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_price,latitude,longitude"
        )
        .eq("status", "published")
        .order("start_at", { ascending: true, nullsFirst: false })
        .limit(300),

      supabase
        .from("venues")
        .select(
          "id,slug,name,city,municipality,district,address,postal_code,description,latitude,longitude"
        )
        .order("name", { ascending: true })
        .limit(500),
    ]);

    if (eventsResponse.error) {
      setMessage(eventsResponse.error.message);
    }

    if (venuesResponse.error) {
      setMessage(venuesResponse.error.message);
    }

    setEvents((eventsResponse.data || []) as EventRow[]);
    setVenues((venuesResponse.data || []) as VenueRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setControlsCollapsed(false);
        return;
      }

      const currentScrollY = window.scrollY;
      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;

      if (isTyping || locating) {
        setControlsCollapsed(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current + 16 && currentScrollY > 180) {
        setControlsCollapsed(true);
        setShowCategoryPicker(false);
      }

      lastScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [locating]);

  useEffect(() => {
    if (locating) {
      setControlsCollapsed(false);
    }
  }, [locating]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(SAVED_MANUAL_LOCATION_KEY);

      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as SavedManualLocation;

      if (
        typeof parsed.latitude === "number" &&
        typeof parsed.longitude === "number" &&
        parsed.source === "manual"
      ) {
        setSavedManualLocation(parsed);
        setManualLocationQuery(parsed.query || parsed.label || "");
      }
    } catch {
      window.localStorage.removeItem(SAVED_MANUAL_LOCATION_KEY);
    }
  }, []);

  useEffect(() => {
    if (!selectedEventId && filteredEvents.length > 0) {
      setSelectedEventId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedEventId]);

  function saveManualLocation(location: SavedManualLocation) {
    setSavedManualLocation(location);
    window.localStorage.setItem(
      SAVED_MANUAL_LOCATION_KEY,
      JSON.stringify(location)
    );
  }

  function useSavedManualLocation(nextRadius: RadiusFilter = "50") {
    if (!savedManualLocation) {
      return;
    }

    setUserLocation(savedManualLocation);
    setManualLocationQuery(savedManualLocation.label || savedManualLocation.query);
    setRadiusFilter(nextRadius === "all" ? "50" : nextRadius);
    setDistrictFilter(ALL_DISTRICTS);
    setMunicipalityFilter(ALL_MUNICIPALITIES);
    setCityFilter(ALL_CITIES);
    setMessage("");
  }

  function handleRadiusChange(value: RadiusFilter) {
    if (value === "all") {
      setRadiusFilter("all");
      return;
    }

    if (!userLocation) {
      if (manualLocationQuery.trim()) {
        useManualLocation(value);
        return;
      }

      if (savedManualLocation) {
        useSavedManualLocation(value);
        return;
      }

      setMessage("Escreve onde estás para usar o filtro por raio.");
      return;
    }

    setRadiusFilter(value);
  }

  async function useManualLocation(nextRadius: RadiusFilter = "50") {
    const cleanQuery = manualLocationQuery.trim();

    if (!cleanQuery) {
      setMessage(
        "Escreve uma morada, localidade, cidade ou concelho para usar como origem do raio."
      );
      return;
    }

    setMessage("");

    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
        }),
      });

      const result = (await response.json()) as GeocodeResponse;

      if (!response.ok) {
        setMessage(result.error || "Não consegui localizar essa morada/localidade.");
        return;
      }

      if (
        typeof result.latitude !== "number" ||
        typeof result.longitude !== "number"
      ) {
        setMessage("A localização encontrada veio sem coordenadas válidas.");
        return;
      }

      const manualLocation: SavedManualLocation = {
        latitude: result.latitude,
        longitude: result.longitude,
        accuracyKm: 0,
        label: result.display_name || cleanQuery,
        source: "manual",
        query: cleanQuery,
      };

      setUserLocation(manualLocation);
      saveManualLocation(manualLocation);
      setManualLocationQuery(manualLocation.label || cleanQuery);
      setRadiusFilter(nextRadius === "all" ? "50" : nextRadius);
      setDistrictFilter(ALL_DISTRICTS);
      setMunicipalityFilter(ALL_MUNICIPALITIES);
      setCityFilter(ALL_CITIES);
    } catch {
      setMessage("Não deu para localizar essa morada/localidade agora.");
    }
  }

  function useBrowserLocation() {
    setControlsCollapsed(false);

    if (!navigator.geolocation) {
      setMessage("Este browser não suporta localização.");
      return;
    }

    setLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyKm: coords.accuracy ? coords.accuracy / 1000 : null,
          label: "A tua localização",
          source: "browser",
        });

        setManualLocationQuery("A tua localização");
        setRadiusFilter((current) => (current === "all" ? "50" : current));
        setDistrictFilter(ALL_DISTRICTS);
        setMunicipalityFilter(ALL_MUNICIPALITIES);
        setCityFilter(ALL_CITIES);
        setMessage("");
        setLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setMessage("Tens de permitir localização no browser.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setMessage("Não consegui obter a tua localização.");
        } else if (error.code === error.TIMEOUT) {
          setMessage("A localização demorou demasiado. Tenta outra vez.");
        } else {
          setMessage("Erro ao obter localização.");
        }

        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  const handleSelectMapEvent = useCallback((event: ParanoidMapEvent) => {
    setSelectedEventId(event.id);
    setControlsCollapsed(false);
    setStreetViewOpen(false);
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-black px-5 pb-24 text-[#f2f1ec] lg:min-h-screen lg:pb-0">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-zinc-500">A carregar radar...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-black text-[#f2f1ec] lg:min-h-screen">
      <section className="absolute inset-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <ParanoidMap
          events={pinEvents}
          userLocation={userLocation}
          selectedEventId={selectedEvent?.id || null}
          radiusKm={radiusFilter === "all" ? null : Number(radiusFilter)}
          mapboxToken={MAPBOX_TOKEN}
          onSelectEvent={handleSelectMapEvent}
        />
      </section>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 to-transparent px-4 pt-4 lg:px-8 lg:pt-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-full border border-white/10 bg-black/45 px-4 py-2 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-red-400">
              Radar
            </p>
            <h1 className="text-sm font-black leading-none lg:text-base">
              Mapa Paranoid
            </h1>
          </div>
          <p className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[11px] font-black text-zinc-100 backdrop-blur-md">
            {filteredEvents.length}
          </p>
        </div>
      </header>

      {message && (
        <div className="absolute inset-x-4 top-24 z-40 rounded-2xl border border-red-900 bg-red-950/80 p-4 backdrop-blur lg:left-8 lg:right-auto lg:max-w-md">
          <p className="text-sm font-bold text-red-100">{message}</p>
        </div>
      )}

      <section
        className={`fixed inset-x-3 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-white/10 bg-black/70 px-3 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform lg:bottom-8 lg:left-1/2 lg:right-auto lg:top-auto lg:w-[min(760px,calc(100vw-420px))] lg:-translate-x-1/2 lg:p-3`}
      >
        {controlsCollapsed && (
          <button
            type="button"
            onClick={() => setControlsCollapsed(false)}
            aria-label="Abrir filtros"
            className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 text-left lg:hidden"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-[#f2f1ec]">
                {manualLocationQuery || userLocation?.label || "Definir zona"}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                {radiusFilter === "all" ? "Portugal" : `${radiusFilter} km`} ·{" "}
                {filteredEvents.length} eventos
              </span>
            </span>
            <span className="rounded-full border border-red-500/50 px-3 py-2 text-xs font-black text-red-100">
              Filtros
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2f1ec] text-sm font-black text-black">
              +
            </span>
          </button>
        )}

        <div className={controlsCollapsed ? "hidden lg:block" : "block"}>
          <div className="mb-2 flex items-center justify-between lg:hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
              Filtros
            </p>
            <button
              type="button"
              onClick={() => setControlsCollapsed(true)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-zinc-200"
            >
              Fechar
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              useManualLocation(radiusFilter === "all" ? "50" : radiusFilter);
            }}
          >
            <div className="grid grid-cols-[1fr_auto] gap-2 lg:grid-cols-[minmax(180px,1fr)_auto_auto_minmax(180px,1fr)_auto_auto] lg:items-center">
              <input
                value={manualLocationQuery}
                onFocus={() => setControlsCollapsed(false)}
                onChange={(event) => setManualLocationQuery(event.target.value)}
                placeholder="Onde estás?"
                className={`min-w-0 rounded-xl border px-4 py-3 text-sm font-bold outline-none placeholder:text-zinc-600 ${
                  userLocation
                    ? "border-green-900 bg-green-950/20 text-green-300 focus:border-green-700"
                    : "border-white/10 bg-black/70 text-[#f2f1ec] focus:border-red-700"
                }`}
              />

              <button
                type="submit"
                className="rounded-xl bg-[#f2f1ec] px-4 py-3 text-sm font-black text-black"
              >
                Usar
              </button>

              <button
                type="button"
                onClick={useBrowserLocation}
                disabled={locating}
                className="hidden rounded-xl border border-red-500/60 bg-red-950/35 px-4 py-3 text-sm font-black text-red-100 disabled:cursor-wait disabled:opacity-70 lg:block"
              >
                {locating ? "A localizar..." : "Localização"}
              </button>

              <div className="hidden grid-cols-[auto_1fr_auto_auto] items-center gap-3 lg:grid">
                <p className="whitespace-nowrap text-sm font-black text-zinc-100">
                  {radiusFilter === "all" ? "Portugal" : `${radiusFilter} km`}
                </p>

                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={radiusFilter === "all" ? "150" : radiusFilter}
                  onFocus={() => setControlsCollapsed(false)}
                  onChange={(event) =>
                    handleRadiusChange(event.target.value as RadiusFilter)
                  }
                  className="h-2 w-full accent-[#f2f1ec]"
                />

                <p className="whitespace-nowrap text-sm font-black text-zinc-300">
                  {filteredEvents.length}
                </p>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker((current) => !current)}
                    aria-label="Escolher tipo de evento"
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/40 text-lg font-black text-zinc-100"
                  >
                    =
                  </button>

                  {showCategoryPicker && (
                    <div className="absolute bottom-14 right-0 z-50 grid max-h-72 min-w-56 gap-2 overflow-auto rounded-2xl border border-white/10 bg-black/90 p-3 shadow-2xl">
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(category);
                            setShowCategoryPicker(false);
                          }}
                          className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
                            categoryFilter === category
                              ? "bg-[#f2f1ec] text-black"
                              : "text-zinc-300 hover:bg-zinc-900"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>

          <button
            type="button"
            onClick={useBrowserLocation}
            disabled={locating}
            className="mt-2 w-full rounded-xl border border-red-500/60 bg-red-950/35 px-4 py-2.5 text-sm font-black text-red-100 disabled:cursor-wait disabled:opacity-70 lg:hidden"
          >
            {locating ? "A localizar..." : "Usar localização atual"}
          </button>

          <div className="mt-2 grid gap-2 lg:hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
              <p className="whitespace-nowrap text-sm font-black text-zinc-300">
                {radiusFilter === "all" ? "Portugal" : `${radiusFilter} km`}
              </p>

              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={radiusFilter === "all" ? "150" : radiusFilter}
                onFocus={() => setControlsCollapsed(false)}
                onChange={(event) =>
                  handleRadiusChange(event.target.value as RadiusFilter)
                }
                className="h-2 w-full accent-[#f2f1ec]"
              />

              <p className="whitespace-nowrap text-sm font-black text-zinc-400">
                {filteredEvents.length}
              </p>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker((current) => !current)}
                  aria-label="Escolher tipo de evento"
                  className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 text-lg font-black text-zinc-200"
                >
                  =
                </button>

                {showCategoryPicker && (
                  <div className="absolute bottom-14 right-0 z-50 grid max-h-72 min-w-56 gap-2 overflow-auto rounded-2xl border border-zinc-800 bg-black p-3 shadow-2xl lg:bottom-auto lg:top-14">
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(category);
                          setShowCategoryPicker(false);
                        }}
                        className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
                          categoryFilter === category
                            ? "bg-[#f2f1ec] text-black"
                            : "text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside
        className={`absolute bottom-[calc(10.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 overflow-hidden rounded-2xl border border-white/10 bg-black/72 shadow-2xl shadow-black/50 backdrop-blur-xl lg:bottom-8 lg:left-auto lg:right-6 lg:top-24 lg:flex lg:max-h-none lg:w-[320px] lg:flex-col lg:pb-0 ${
          controlsCollapsed ? "block" : "hidden lg:flex"
        }`}
      >
        {selectedEvent ? (
          <div className="border-b border-white/10 p-3">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <button
                type="button"
                onClick={() => selectRelativeEvent(-1)}
                aria-label="Evento anterior"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-xl font-black text-[#f2f1ec] lg:hidden"
              >
                ‹
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
                    {eventDisplayDate(selectedEvent)}
                  </p>
                  <p className="text-[10px] font-black text-zinc-500 lg:hidden">
                    {selectedEventIndex + 1}/{filteredEvents.length}
                  </p>
                </div>
                <h2 className="mt-1 line-clamp-1 text-lg font-black leading-tight lg:line-clamp-2 lg:text-base">
                  {selectedEvent.title}
                </h2>
                <p className="mt-1 truncate text-xs text-zinc-300">
                  {selectedEvent.venue_name ||
                    selectedEvent.venue?.name ||
                    "Sem espaco"}{" "}
                  ·{" "}
                  {[getEventCity(selectedEvent), getEventMunicipality(selectedEvent)]
                    .filter(Boolean)
                    .join(" / ") ||
                    getEventDistrict(selectedEvent) ||
                    "Sem zona"}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">
                    {selectedEvent.display_time || "Hora por definir"}
                  </span>
                  {selectedEvent.distanceKm !== null && (
                    <span className="font-black text-green-300">
                      {formatDistance(selectedEvent.distanceKm)}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => selectRelativeEvent(1)}
                aria-label="Próximo evento"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-xl font-black text-[#f2f1ec] lg:hidden"
              >
                ›
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <Link
                href={`/eventos/${selectedEvent.slug}`}
                className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-2.5 text-center text-xs font-black text-black"
              >
                Ver evento
              </Link>
              <a
                href={selectedMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 bg-black/30 px-4 py-2.5 text-xs font-black text-zinc-100"
              >
                Rota
              </a>
              {selectedEvent.finalLatitude !== null &&
              selectedEvent.finalLongitude !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    setStreetViewOpen(true);
                    setControlsCollapsed(true);
                  }}
                  className="rounded-full border border-white/15 bg-black/30 px-4 py-2.5 text-xs font-black text-zinc-100"
                >
                  Street
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm font-bold text-zinc-500">Sem eventos no radar.</p>
          </div>
        )}

        <div className="hidden flex-1 space-y-2 overflow-auto p-3 lg:block">
          {filteredEvents.length === 0 ? (
            <p className="rounded-2xl border border-zinc-900 p-4 text-sm font-bold text-zinc-500">
              Muda o raio ou a categoria.
            </p>
          ) : (
            filteredEvents.map((event) => (
              <EventSummary
                key={event.id}
                event={event}
                selected={event.id === selectedEvent?.id}
                onSelect={() => setSelectedEventId(event.id)}
              />
            ))
          )}
        </div>
      </aside>

      <StreetViewPanel
        apiKey={GOOGLE_MAPS_API_KEY}
        latitude={selectedEvent?.finalLatitude ?? null}
        longitude={selectedEvent?.finalLongitude ?? null}
        title={selectedEvent?.title || "Evento"}
        open={streetViewOpen}
        onClose={() => setStreetViewOpen(false)}
      />
    </main>
  );
}
