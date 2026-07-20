"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
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
import type {
  ParanoidMapEvent,
  ParanoidMapUserLocation,
} from "@/components/map/ParanoidMap";
import { MapLoadingState } from "@/components/LoadingSkeleton";
import { supabase } from "@/lib/supabase/public";

const ParanoidMap = dynamic(
  () =>
    import("@/components/map/ParanoidMap").then(
      (module) => module.ParanoidMap
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="A carregar mapa"
        className="h-full min-h-[520px] w-full bg-black"
      />
    ),
  }
);

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

type MapDateFilter = EventDateFilter | "date";

const LOCATION_RADIUS_BUFFER_KM = 0.75;
const SAVED_MANUAL_LOCATION_KEY = "paranoid.map.manualLocation";

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
  organizer_id: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  start_at: string | null;
  start_date: string | null;
  end_date: string | null;
  is_multi_day: boolean | null;
  category: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  frequencyActive?: boolean;
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
  return event.starts_at || event.start_at || event.start_date || event.display_date || "";
}

function lisbonDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function startOfLisbonDayIso(date = new Date()) {
  const day = lisbonDateKey(date);
  const [year, month, value] = day.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, value, 0));
  const representedHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hourCycle: "h23" }).format(probe));
  return new Date(probe.getTime() - representedHour * 60 * 60 * 1000).toISOString();
}

function dateKey(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const cleanValue = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function eventMatchesCustomDate(event: EventRow, customDate: string) {
  if (!customDate) {
    return true;
  }

  const startKey = dateKey(event.starts_at || event.start_at || event.start_date || event.display_date);
  const endKey = dateKey(event.ends_at || event.end_date);

  if (!startKey) {
    return false;
  }

  if (endKey) {
    return customDate >= startKey && customDate <= endKey;
  }

  return customDate === startKey;
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

function radarLabel(count: number) {
  return count === 1 ? "1 evento no radar." : `${count} eventos no radar.`;
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

  const firstPriority = first.featured ? 2 : first.frequencyActive ? 1 : 0;
  const secondPriority = second.featured ? 2 : second.frequencyActive ? 1 : 0;

  if (firstPriority !== secondPriority) {
    return secondPriority - firstPriority;
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
      data-map-event-card={event.id}
      aria-pressed={selected}
      className={`pressable focus-ring block w-full min-w-0 shrink-0 rounded-xl border px-3 py-3 text-left transition ${
        selected
          ? "border-accent/70 bg-surface-hover"
          : "border-white/10 bg-surface hover:border-white/20 hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
            {eventDisplayDate(event)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-foreground">
            {event.title || "Evento"}
          </h3>
        </div>
        <span className="whitespace-nowrap rounded-full border border-white/10 bg-surface-secondary px-2.5 py-1 text-[10px] font-black text-foreground-secondary">
          {formatDistance(event.distanceKm)}
        </span>
      </div>

      <p className="mt-2 truncate text-xs font-bold text-foreground-secondary">
        {event.venue_name || event.venue?.name || "Sem espaço"}
      </p>
      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
        {cityArea || getEventDistrict(event) || "Sem zona"}
      </p>
      {event.finalLatitude === null || event.finalLongitude === null ? (
        <p className="mt-2 text-[10px] font-bold uppercase text-foreground-muted">
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
  const [, setSavedManualLocation] =
    useState<SavedManualLocation | null>(null);
  const [manualLocationQuery, setManualLocationQuery] = useState("");

  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>("50");
  const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS);
  const [municipalityFilter, setMunicipalityFilter] =
    useState(ALL_MUNICIPALITIES);
  const [cityFilter, setCityFilter] = useState(ALL_CITIES);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [dateFilter, setDateFilter] = useState<MapDateFilter>("all");
  const [customDateFilter, setCustomDateFilter] = useState("");
  const [includePastEvents, setIncludePastEvents] = useState(false);
  const priceFilter: EventPriceFilter = "all";
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventCardOpen, setEventCardOpen] = useState(true);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
  const sheetDragStartY = useRef<number | null>(null);
  const sheetWasDragged = useRef(false);
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
      dateFilter: dateFilter === "date" ? "all" : dateFilter,
      priceFilter,
    })
      .map((indexedEvent) => indexedEvent.event)
      .filter((event) =>
        dateFilter === "date"
          ? eventMatchesCustomDate(event, customDateFilter)
          : true
      )
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
    dateFilter,
    customDateFilter,
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
        featured: Boolean(event.featured),
        frequencyActive: Boolean(event.frequencyActive),
      }));
  }, [filteredEvents]);

  // Markers stay visible while the initial filter panel is open. Applying the
  // filters controls the selected event card, not whether valid events exist.
  const visiblePinEvents = pinEvents;

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

  const currentRadarLabel = radarLabel(filteredEvents.length);

  useEffect(() => {
    if (!selectedEvent?.id || !eventCardOpen) {
      return;
    }

    document
      .querySelector<HTMLElement>(`[data-map-event-card="${selectedEvent.id}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [eventCardOpen, selectedEvent?.id]);

  function selectRelativeEvent(direction: -1 | 1) {
    if (filteredEvents.length === 0) {
      return;
    }

    const currentIndex = selectedEventIndex >= 0 ? selectedEventIndex : 0;
    const nextIndex =
      (currentIndex + direction + filteredEvents.length) % filteredEvents.length;

    setSelectedEventId(filteredEvents[nextIndex].id);
    setEventCardOpen(true);
  }

  function finishSheetDrag(clientY: number) {
    if (sheetDragStartY.current === null) return;
    const distance = clientY - sheetDragStartY.current;
    if (Math.abs(distance) >= 36) {
      sheetWasDragged.current = true;
      setMobileSheetExpanded(distance < 0);
    }
    sheetDragStartY.current = null;
  }

  const loadMapData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const nowIso = new Date().toISOString();
    const today = lisbonDateKey();
    const todayStartIso = startOfLisbonDayIso();
    let structuredEventsQuery = supabase
      .from("events")
      .select("id,slug,title,status,publication_status,visibility,city,municipality,district,address,postal_code,venue_id,venue_name,organizer_id,organizer_name,display_date,display_time,starts_at,ends_at,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_price,latitude,longitude")
      .eq("publication_status", "published")
      .eq("visibility", "public")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(300);
    if (!includePastEvents) {
      structuredEventsQuery = structuredEventsQuery.or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${todayStartIso}),and(starts_at.is.null,end_date.gte.${today}),and(starts_at.is.null,end_date.is.null,start_date.gte.${today})`);
    }
    const structuredEventsResponse = await structuredEventsQuery;
    let eventsData = structuredEventsResponse.data as unknown as EventRow[] | null;
    let eventsError = structuredEventsResponse.error;

    if (eventsError?.code && ["42703", "PGRST204", "PGRST205"].includes(eventsError.code)) {
      let legacyEventsQuery = supabase
        .from("events")
        .select("id,slug,title,status,city,municipality,district,address,postal_code,venue_id,venue_name,organizer_id,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_price,latitude,longitude")
        .eq("status", "published")
        .order("start_at", { ascending: true, nullsFirst: false })
        .limit(300);
      if (!includePastEvents) {
        legacyEventsQuery = legacyEventsQuery.or(`end_date.gte.${today},and(end_date.is.null,start_at.gte.${todayStartIso}),and(end_date.is.null,start_at.is.null,start_date.gte.${today})`);
      }
      const legacyEventsResponse = await legacyEventsQuery;
      eventsData = legacyEventsResponse.data as EventRow[] | null;
      eventsError = legacyEventsResponse.error;
    }

    const [venuesResponse, frequencyResponse] = await Promise.all([
      supabase
        .from("venues")
        .select(
          "id,slug,name,city,municipality,district,address,postal_code,description,latitude,longitude"
        )
        .order("name", { ascending: true })
        .limit(500),
      fetch("/api/billing/frequency/active-organizers").catch(() => null),
    ]);

    if (eventsError) {
      setMessage(eventsError.message);
    }

    if (venuesResponse.error) {
      setMessage(venuesResponse.error.message);
    }

    const frequencyPayload = frequencyResponse?.ok
      ? await frequencyResponse.json().catch(() => ({ organizerIds: [] }))
      : { organizerIds: [] };
    const frequencyOrganizerIds = new Set<string>(
      frequencyPayload.organizerIds || []
    );

    setEvents(
      (eventsData || []).map((event) => ({
        ...event,
        frequencyActive: Boolean(
          event.organizer_id && frequencyOrganizerIds.has(event.organizer_id)
        ),
      }))
    );
    setVenues((venuesResponse.data || []) as VenueRow[]);
    setLoading(false);
  }, [includePastEvents]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadMapData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMapData]);

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

      if (!hasAppliedFilters || isTyping || locating) {
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
  }, [hasAppliedFilters, locating]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const rawValue = window.localStorage.getItem(SAVED_MANUAL_LOCATION_KEY);
        if (!rawValue) return;
        const parsed = JSON.parse(rawValue) as SavedManualLocation;
        if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number" && parsed.source === "manual") {
          setSavedManualLocation(parsed);
        }
      } catch {
        window.localStorage.removeItem(SAVED_MANUAL_LOCATION_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasAppliedFilters && !selectedEventId && filteredEvents.length > 0) {
      const timer = window.setTimeout(() => setSelectedEventId(filteredEvents[0].id), 0);
      return () => window.clearTimeout(timer);
    }
  }, [filteredEvents, hasAppliedFilters, selectedEventId]);

  function saveManualLocation(location: SavedManualLocation) {
    setSavedManualLocation(location);
    window.localStorage.setItem(
      SAVED_MANUAL_LOCATION_KEY,
      JSON.stringify(location)
    );
  }

  function handleRadiusChange(value: RadiusFilter) {
    setRadiusFilter(value);
    setControlsCollapsed(false);
  }

  function applyFiltersWithoutLocation() {
    setMessage("");
    setHasAppliedFilters(true);
    setControlsCollapsed(true);
    setEventCardOpen(true);
  }

  function handleApplyFilters() {
    if (manualLocationQuery.trim()) {
      applyManualLocation(radiusFilter === "all" ? "50" : radiusFilter);
      return;
    }

    applyFiltersWithoutLocation();
  }

  async function applyManualLocation(nextRadius: RadiusFilter = "50") {
    const cleanQuery = manualLocationQuery.trim();

    if (!cleanQuery) {
      setMessage(
        "Escreve uma morada, localidade, cidade ou concelho para usar como origem do raio."
      );
      return;
    }

    setMessage("");

    if (
      userLocation &&
      (cleanQuery === userLocation.label ||
        (userLocation.source === "browser" && cleanQuery === "A tua localização"))
    ) {
      setRadiusFilter(nextRadius === "all" ? "50" : nextRadius);
      setDistrictFilter(ALL_DISTRICTS);
      setMunicipalityFilter(ALL_MUNICIPALITIES);
      setCityFilter(ALL_CITIES);
      setHasAppliedFilters(true);
      setControlsCollapsed(true);
      setEventCardOpen(true);
      return;
    }

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
      setHasAppliedFilters(true);
      setControlsCollapsed(true);
      setEventCardOpen(true);
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

    setControlsCollapsed(false);
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
        setHasAppliedFilters(true);
        setControlsCollapsed(true);
        setEventCardOpen(true);
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
    setHasAppliedFilters(true);
    setControlsCollapsed(true);
    setEventCardOpen(true);
  }, []);

  const handleEmptyMapClick = useCallback(() => {
    setControlsCollapsed(true);
    setShowCategoryPicker(false);
  }, []);

  const dateQuickFilters: Array<{
    value: MapDateFilter;
    label: string;
  }> = [
    { value: "today", label: "Hoje" },
    { value: "7d", label: "7 dias" },
    { value: "30d", label: "Mês" },
    { value: "date", label: "Data" },
  ];

  if (loading) {
    return (
      <main className="brand-surface map-screen bg-black pb-24 text-foreground lg:pb-0">
        <MapLoadingState />
      </main>
    );
  }

  return (
    <main className="brand-surface map-screen relative overflow-hidden bg-black text-foreground">
      <section className="absolute inset-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <ParanoidMap
          events={visiblePinEvents}
          userLocation={userLocation}
          selectedEventId={hasAppliedFilters ? selectedEvent?.id || null : null}
          radiusKm={radiusFilter === "all" ? null : Number(radiusFilter)}
          onSelectEvent={handleSelectMapEvent}
          onEmptyMapClick={handleEmptyMapClick}
        />
      </section>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 to-transparent px-4 pt-4 lg:px-8 lg:pt-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-full border border-white/10 bg-black/45 px-4 py-2 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-accent">
              Radar
            </p>
            <h1 className="text-sm font-black leading-none lg:text-base">
              Mapa Paranoid
            </h1>
          </div>
          <p className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[11px] font-black text-foreground-secondary backdrop-blur-md">
            {filteredEvents.length}
          </p>
        </div>
      </header>

      {message && (
        <div className="absolute inset-x-4 top-24 z-40 rounded-2xl border border-danger/40 bg-danger/15 p-4 backdrop-blur lg:left-8 lg:right-auto lg:max-w-md">
          <p className="text-sm font-bold text-danger">{message}</p>
        </div>
      )}

      <section
        className={`shadow-floating absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 rounded-2xl border border-white/10 bg-black/70 px-3 py-3 backdrop-blur-xl transition-transform lg:bottom-6 lg:left-6 lg:right-[428px] lg:top-auto lg:w-auto lg:max-w-[680px] lg:translate-x-0 lg:p-3`}
      >
        {controlsCollapsed && (
          <button
            type="button"
            onClick={() => setControlsCollapsed(false)}
            aria-label="Abrir filtros"
            className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 text-left lg:hidden"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-foreground">
                {manualLocationQuery || userLocation?.label || "Definir zona"}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
                {radiusFilter === "all" ? "Portugal" : `${radiusFilter} km`} ·{" "}
                {filteredEvents.length} eventos
              </span>
            </span>
            <span className="rounded-full border border-accent/50 px-3 py-2 text-xs font-black text-accent">
              Filtros
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2f1ec] text-sm font-black text-black">
              +
            </span>
          </button>
        )}

        <div className={controlsCollapsed ? "hidden lg:block" : "block"}>
          <div className="mb-2 flex items-center justify-between lg:hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">
              Filtros
            </p>
            <button
              type="button"
              onClick={() => setControlsCollapsed(true)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-foreground-secondary"
            >
              Fechar
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleApplyFilters();
            }}
          >
            <div className="grid grid-cols-[1fr_auto] gap-2 lg:grid-cols-[minmax(180px,1fr)_auto_auto_minmax(180px,1fr)_auto_auto] lg:items-center">
              <input
                value={manualLocationQuery}
                onFocus={() => setControlsCollapsed(false)}
                onChange={(event) => setManualLocationQuery(event.target.value)}
                placeholder="Onde estás?"
                className={`min-w-0 rounded-xl border px-4 py-3 text-sm font-bold outline-none placeholder:text-input-placeholder ${
                  userLocation
                    ? "border-green-900 bg-green-950/20 text-green-300 focus:border-green-700"
                    : "border-white/10 bg-black/70 text-foreground focus:border-accent"
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
                className="hidden rounded-xl border border-accent/50 bg-accent/12 px-4 py-3 text-sm font-black text-accent disabled:cursor-wait disabled:opacity-70 lg:block"
              >
                {locating ? "A localizar..." : userLocation?.source === "browser" ? "Localizado" : "Localização"}
              </button>

              <div className="hidden grid-cols-[auto_1fr_auto_auto] items-center gap-3 lg:grid">
                <p className="whitespace-nowrap text-sm font-black text-foreground-secondary">
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

                <p className="whitespace-nowrap text-sm font-black text-foreground-secondary">
                  {filteredEvents.length}
                </p>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker((current) => !current)}
                    aria-label="Escolher tipo de evento"
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/40 text-lg font-black text-foreground-secondary"
                  >
                    =
                  </button>

                  {showCategoryPicker && (
                    <div className="shadow-dropdown absolute bottom-14 right-0 z-50 grid max-h-72 min-w-56 gap-2 overflow-auto rounded-2xl border border-white/10 bg-black/90 p-3">
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(category);
                            setShowCategoryPicker(false);
                            setEventCardOpen(true);
                          }}
                          className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
                            categoryFilter === category
                              ? "bg-[#f2f1ec] text-black"
                              : "text-foreground-secondary hover:bg-surface-hover"
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

          <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/45 p-1">
            {dateQuickFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setDateFilter(option.value);
                  setEventCardOpen(true);
                }}
                className={`rounded-lg px-2 py-2 text-[11px] font-black ${
                  dateFilter === option.value
                    ? "bg-[#f2f1ec] text-black"
                    : "text-foreground-secondary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="mt-2 flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/45 px-3 text-xs font-bold text-foreground-secondary">
            <span>Mostrar eventos passados</span>
            <input type="checkbox" checked={includePastEvents} onChange={(event) => setIncludePastEvents(event.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          </label>

          {dateFilter === "date" && (
            <input
              type="date"
              value={customDateFilter}
              onChange={(event) => {
                setCustomDateFilter(event.target.value);
                setEventCardOpen(true);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 text-sm font-black text-foreground outline-none focus:border-accent"
            />
          )}

          <button
            type="button"
            onClick={useBrowserLocation}
            disabled={locating}
            className="mt-2 w-full rounded-xl border border-accent/50 bg-accent/12 px-4 py-2.5 text-sm font-black text-accent disabled:cursor-wait disabled:opacity-70 lg:hidden"
          >
            {locating ? "A localizar..." : userLocation?.source === "browser" ? "Localizado" : "Usar localização atual"}
          </button>

          <div className="mt-2 grid gap-2 lg:hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
              <p className="whitespace-nowrap text-sm font-black text-foreground-secondary">
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

              <p className="whitespace-nowrap text-sm font-black text-foreground-muted">
                {filteredEvents.length}
              </p>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker((current) => !current)}
                  aria-label="Escolher tipo de evento"
                  className="grid h-11 w-11 place-items-center rounded-full border border-border-strong text-lg font-black text-foreground-secondary"
                >
                  =
                </button>

                {showCategoryPicker && (
                  <div className="shadow-dropdown absolute bottom-14 right-0 z-50 grid max-h-72 min-w-56 gap-2 overflow-auto rounded-2xl border border-border bg-surface p-3 lg:bottom-auto lg:top-14">
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(category);
                          setShowCategoryPicker(false);
                          setEventCardOpen(true);
                        }}
                        className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
                          categoryFilter === category
                            ? "bg-[#f2f1ec] text-black"
                            : "text-foreground-secondary hover:bg-surface-hover"
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
        aria-label="Eventos no radar"
        className={`shadow-map-panel absolute bottom-[calc(8.05rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgb(10_10_10_/_0.97)] lg:bottom-6 lg:left-auto lg:right-6 lg:top-6 lg:max-h-[calc(100%-3rem)] lg:w-[380px] lg:max-w-[calc(100%-3rem)] lg:pb-0 ${mobileSheetExpanded ? "max-h-[70vh]" : "max-h-[38vh]"} ${
          hasAppliedFilters && controlsCollapsed && eventCardOpen
            ? "slide-up flex flex-col"
            : "hidden lg:flex"
        }`}
      >
        <div className="w-full shrink-0 border-b border-white/10 px-3 pb-2.5 pt-2 lg:px-4 lg:pb-3 lg:pt-3">
          <button type="button" aria-label={mobileSheetExpanded ? "Reduzir lista de eventos" : "Expandir lista de eventos"} onClick={() => { if (sheetWasDragged.current) { sheetWasDragged.current = false; return; } setMobileSheetExpanded((value) => !value); }} onPointerDown={(event) => { sheetWasDragged.current = false; sheetDragStartY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => finishSheetDrag(event.clientY)} onPointerCancel={() => { sheetDragStartY.current = null; }} className="mx-auto mb-2 block h-5 w-14 touch-none rounded-full lg:hidden"><span className="mx-auto block h-1 w-10 rounded-full bg-white/30" /></button>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
            {selectedEvent ? (
              <button
                type="button"
                onClick={() => selectRelativeEvent(-1)}
                aria-label="Evento anterior"
                className="pressable focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/40 text-lg font-black text-foreground lg:hidden"
              >
                ‹
              </button>
            ) : <span className="hidden lg:hidden" />}

            <div className="min-w-0 text-center lg:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">
                Radar
              </p>
              <p className="mt-0.5 text-base font-black leading-tight text-foreground" aria-live="polite">
                {currentRadarLabel}
              </p>
              {selectedEvent && (
                <p className="mt-0.5 text-[10px] font-black text-foreground-muted lg:hidden">
                  {selectedEventIndex + 1}/{filteredEvents.length}
                </p>
              )}
            </div>

            {selectedEvent ? (
              <button
                type="button"
                onClick={() => selectRelativeEvent(1)}
                aria-label="Próximo evento"
                className="pressable focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/40 text-lg font-black text-foreground lg:hidden"
              >
                ›
              </button>
            ) : <span className="hidden lg:hidden" />}
          </div>
        </div>

        <div className="paranoid-scrollbar relative flex min-h-0 w-full flex-1 touch-pan-y flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-y-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:p-4">
          {filteredEvents.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-surface p-4 text-sm font-bold text-foreground-secondary" role="status" aria-live="polite">
              Sem eventos no radar.
            </p>
          ) : (
            <>
              {filteredEvents.map((event) => (
                <EventSummary
                  key={event.id}
                  event={event}
                  selected={event.id === selectedEvent?.id}
                  onSelect={() => {
                    setSelectedEventId(event.id);
                    setHasAppliedFilters(true);
                    setControlsCollapsed(true);
                    setEventCardOpen(true);
                  }}
                />
              ))}
              <div className="h-1" aria-hidden="true" />
            </>
          )}
        </div>

        {selectedEvent && (
          <div className="relative z-10 w-full shrink-0 border-t border-white/10 bg-black p-3 lg:p-4">
            <div className="flex gap-2">
              <Link
                href={`/eventos/${selectedEvent.slug}`}
                className="pressable focus-ring flex-1 rounded-full bg-[var(--accent)] px-4 py-2 text-center text-xs font-black text-white hover:bg-[var(--accent-hover)]"
              >
                Ver evento
              </Link>
              <a
                href={selectedMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="pressable focus-ring rounded-full border border-white/15 bg-transparent px-4 py-2 text-xs font-black text-foreground-secondary hover:bg-surface-hover"
              >
                Rota
              </a>
              <button
                type="button"
                onClick={() => setEventCardOpen(false)}
                aria-label="Fechar lista de eventos"
                className="pressable focus-ring grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-transparent text-sm font-black text-foreground-secondary hover:bg-surface-hover lg:hidden"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
