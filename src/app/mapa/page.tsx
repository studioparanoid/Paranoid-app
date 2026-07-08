"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_CATEGORIES,
  ALL_CITIES,
  ALL_DISTRICTS,
  ALL_MUNICIPALITIES,
  buildEventFilterIndex,
  eventDateFilterOptions,
  type EventDateFilter,
  eventPriceFilterOptions,
  type EventPriceFilter,
  filterIndexedEvents,
  getCategoryOptionsForIndexedEvents,
  getCityOptionsForIndexedEvents,
  getDistrictOptions,
  getMunicipalityOptions,
  normalizeEventText,
} from "@/lib/eventFilters";
import {
  getCanonicalDistrict,
  getCanonicalMunicipality,
  portugalMunicipalities,
} from "@/lib/portugalLocations";
import { supabase } from "@/lib/supabase/public";

type RadiusFilter = "5" | "15" | "50" | "150" | "all";

type UserLocation = {
  latitude: number;
  longitude: number;
  accuracyKm: number | null;
  label: string;
  source: "browser" | "manual";
};

type SavedManualLocation = UserLocation & {
  query: string;
  source: "manual";
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type GeolocationErrorCode = 1 | 2 | 3;

const LOCATION_RADIUS_BUFFER_KM = 0.75;
const GOOD_LOCATION_ACCURACY_METERS = 50;
const SAVED_MANUAL_LOCATION_KEY = "paranoid.map.manualLocation";
const MAX_AUTO_TO_MANUAL_DISTANCE_KM = 25;

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

function ticketLabel(value: string | null | undefined) {
  if (value === "internal") {
    return "Bilheteira Paranoid";
  }

  if (value === "external") {
    return "Bilhetes";
  }

  return null;
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

function formatAccuracy(value: number | null) {
  if (value === null) {
    return "precisão desconhecida";
  }

  if (value < 1) {
    return `precisão aprox. ${Math.round(value * 1000)} m`;
  }

  return `precisão aprox. ${value.toFixed(1)} km`;
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

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  const code = error.code as GeolocationErrorCode;

  if (code === 1) {
    return "A localização está bloqueada. No telemóvel, autoriza a localização para este site no browser e confirma que a localização do sistema está ligada.";
  }

  if (code === 2) {
    return "Não consegui determinar a tua localização. Confirma GPS/localização do sistema, Wi-Fi/dados móveis e tenta outra vez.";
  }

  if (code === 3) {
    return "A localização demorou demasiado tempo. Tenta outra vez ao ar livre ou usa uma morada manual guardada como origem do raio.";
  }

  return "Não deu para obter a tua localização. Podes usar distrito, concelho ou localidade.";
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return typeof error === "object" && error !== null && "code" in error;
}

function getCurrentPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function getBestWatchedPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let settled = false;

    const finish = (position: GeolocationPosition) => {
      if (settled) {
        return;
      }

      settled = true;
      navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timeoutId);
      resolve(position);
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
        }

        if (position.coords.accuracy <= GOOD_LOCATION_ACCURACY_METERS) {
          finish(position);
        }
      },
      (error) => {
        if (settled) {
          return;
        }

        if (isGeolocationError(error) && error.code === 1) {
          settled = true;
          navigator.geolocation.clearWatch(watchId);
          window.clearTimeout(timeoutId);
          reject(error);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 35000,
      }
    );

    const timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }

      if (bestPosition) {
        finish(bestPosition);
        return;
      }

      settled = true;
      navigator.geolocation.clearWatch(watchId);
      reject({ code: 3 });
    }, 38000);
  });
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

function EmptyState() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Sem resultados
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        Nada neste radar.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        Muda o distrito, concelho, localidade ou vê Portugal inteiro.
      </p>

      <Link
        href="/agenda"
        className="mt-8 inline-block rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
      >
        Ver agenda completa
      </Link>
    </section>
  );
}

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [events, setEvents] = useState<EventRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [savedManualLocation, setSavedManualLocation] =
    useState<SavedManualLocation | null>(null);
  const [manualLocationQuery, setManualLocationQuery] = useState("");

  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS);
  const [municipalityFilter, setMunicipalityFilter] =
    useState(ALL_MUNICIPALITIES);
  const [cityFilter, setCityFilter] = useState(ALL_CITIES);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [dateFilter, setDateFilter] = useState<EventDateFilter>("all");
  const [priceFilter, setPriceFilter] = useState<EventPriceFilter>("all");
  const [onlyWithLocation, setOnlyWithLocation] = useState(false);

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

  const districtOptions = useMemo(() => getDistrictOptions(), []);

  const municipalityOptions = useMemo(() => {
    return getMunicipalityOptions(districtFilter);
  }, [districtFilter]);

  const cityOptions = useMemo(() => {
    return getCityOptionsForIndexedEvents(
      indexedEvents,
      districtFilter,
      municipalityFilter
    );
  }, [indexedEvents, districtFilter, municipalityFilter]);

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
      searchQuery,
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

        if (onlyWithLocation && !hasCoordinates) {
          return false;
        }

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
    onlyWithLocation,
    radiusFilter,
    districtFilter,
    municipalityFilter,
    cityFilter,
    categoryFilter,
    dateFilter,
    priceFilter,
    searchQuery,
    userLocation,
  ]);

  const eventsWithCoordinatesCount = eventsWithLocation.filter(
    (event) => event.finalLatitude !== null && event.finalLongitude !== null
  ).length;

  const closestEvent = filteredEvents.find(
    (event) => event.distanceKm !== null
  );

  const closestLocatedEvent = useMemo(() => {
    if (!userLocation) {
      return null;
    }

    return (
      [...eventsWithLocation]
        .filter((event) => event.distanceKm !== null)
        .sort(sortEvents)[0] || null
    );
  }, [eventsWithLocation, userLocation]);

  const userLocationMapsUrl = userLocation
    ? buildGoogleMapsUrl(
        userLocation.latitude,
        userLocation.longitude,
        userLocation.label
      )
    : null;

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
    setManualLocationQuery(savedManualLocation.query);
    setRadiusFilter(nextRadius === "all" ? "50" : nextRadius);
    setDistrictFilter(ALL_DISTRICTS);
    setMunicipalityFilter(ALL_MUNICIPALITIES);
    setCityFilter(ALL_CITIES);
    setMessage("");
  }

  function forgetSavedManualLocation() {
    setSavedManualLocation(null);
    window.localStorage.removeItem(SAVED_MANUAL_LOCATION_KEY);
  }

  async function requestLocation(nextRadius: RadiusFilter = "50") {
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("O teu browser não suporta localização.");
      return;
    }

    if (!window.isSecureContext) {
      setMessage(
        "O browser só permite localização em HTTPS. Em telemóvel, um endereço local por HTTP costuma bloquear sempre. Abre a Paranoid num domínio seguro para usar o raio."
      );
      return;
    }

    setLocationLoading(true);

    try {
      let position: GeolocationPosition;

      try {
        position = await getBestWatchedPosition();
      } catch (error) {
        if (isGeolocationError(error) && error.code === 1) {
          throw error;
        }

        position = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      }

      const browserLocation: UserLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyKm: Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy / 1000
          : null,
        label: "A tua localização atual",
        source: "browser",
      };

      if (savedManualLocation) {
        const distanceFromSavedOrigin = distanceInKm(browserLocation, {
          latitude: savedManualLocation.latitude,
          longitude: savedManualLocation.longitude,
        });

        if (distanceFromSavedOrigin > MAX_AUTO_TO_MANUAL_DISTANCE_KM) {
          setUserLocation(savedManualLocation);
          setManualLocationQuery(savedManualLocation.query);
          setMessage(
            `A localização automática veio ${formatDistance(
              distanceFromSavedOrigin
            )} longe da tua origem guardada. Usei a morada guardada como origem do raio.`
          );
          setRadiusFilter(nextRadius === "all" ? "50" : nextRadius);
          setDistrictFilter(ALL_DISTRICTS);
          setMunicipalityFilter(ALL_MUNICIPALITIES);
          setCityFilter(ALL_CITIES);
          return;
        }
      }

      setUserLocation(browserLocation);

      setRadiusFilter(nextRadius === "all" ? "50" : nextRadius);
      setDistrictFilter(ALL_DISTRICTS);
      setMunicipalityFilter(ALL_MUNICIPALITIES);
      setCityFilter(ALL_CITIES);
    } catch (error) {
      setMessage(
        isGeolocationError(error)
          ? getGeolocationErrorMessage(error)
          : "Não deu para obter a tua localização. Podes usar distrito, concelho ou localidade."
      );
    } finally {
      setLocationLoading(false);
    }
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

      requestLocation(value);
      return;
    }

    setRadiusFilter(value);
  }

  function handleLocationButtonClick() {
    requestLocation(radiusFilter === "all" ? "50" : radiusFilter);
  }

  async function useManualLocation(nextRadius: RadiusFilter = "50") {
    const cleanQuery = manualLocationQuery.trim();

    if (!cleanQuery) {
      setMessage("Escreve uma morada, localidade, cidade ou concelho para usar como origem do raio.");
      return;
    }

    setLocationLoading(true);
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
      setRadiusFilter(nextRadius === "all" ? "50" : nextRadius);
      setDistrictFilter(ALL_DISTRICTS);
      setMunicipalityFilter(ALL_MUNICIPALITIES);
      setCityFilter(ALL_CITIES);
    } catch {
      setMessage("Não deu para localizar essa morada/localidade agora.");
    } finally {
      setLocationLoading(false);
    }
  }

  function clearUserLocation() {
    setUserLocation(null);
    setRadiusFilter("all");
  }

  function getLocationHint() {
    if (locationLoading) {
      return "A pedir permissão ao browser e a calcular distâncias...";
    }

    if (userLocation) {
      if (userLocation.source === "manual") {
        return `Origem do raio: ${userLocation.label}. Podes ajustar o raio abaixo.`;
      }

      if (
        radiusFilter !== "all" &&
        filteredEvents.length === 0 &&
        closestLocatedEvent?.distanceKm !== null &&
        closestLocatedEvent?.distanceKm !== undefined
      ) {
        return `Localização automática ativa (${formatAccuracy(
          userLocation.accuracyKm
        )}), mas o evento mais próximo dessa coordenada fica a ${formatDistance(
          closestLocatedEvent.distanceKm
        )}. Se isto não bater certo, usa a morada manual: a Paranoid guarda essa origem neste browser e usa-a no raio.`;
      }

      if (userLocation.accuracyKm !== null && userLocation.accuracyKm > 1) {
        return `Localização automática pouco precisa (${formatAccuracy(
          userLocation.accuracyKm
        )}). Para raio de 5 km, escreve a tua morada/localidade no campo manual.`;
      }

      return `Localização automática ativa (${formatAccuracy(
        userLocation.accuracyKm
      )}).`;
    }

    return "Escolhe um raio ou usa o botão de localização para ver eventos perto de ti.";
  }

  function getRadiusLabel() {
    if (!userLocation && radiusFilter !== "all") {
      return "A pedir localização";
    }

    if (radiusFilter === "all") {
      return "Portugal inteiro";
    }

    if (userLocation?.accuracyKm) {
      return `Até ${radiusFilter} km`;
    }

    return `Até ${radiusFilter} km`;
  }


  function handleDistrictChange(value: string) {
    setDistrictFilter(value);
    setMunicipalityFilter(ALL_MUNICIPALITIES);
    setCityFilter(ALL_CITIES);
  }

  function handleMunicipalityChange(value: string) {
    setMunicipalityFilter(value);
    setCityFilter(ALL_CITIES);
  }

  function clearFilters() {
    setRadiusFilter(userLocation ? "50" : "all");
    setSearchQuery("");
    setDistrictFilter(ALL_DISTRICTS);
    setMunicipalityFilter(ALL_MUNICIPALITIES);
    setCityFilter(ALL_CITIES);
    setCategoryFilter(ALL_CATEGORIES);
    setDateFilter("all");
    setPriceFilter("all");
    setOnlyWithLocation(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">A carregar mapa cultural...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Mapa
            </p>

            <h1 className="text-6xl font-black leading-none tracking-tight lg:text-9xl">
              Portugal em ruído.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 lg:text-lg">
              Eventos e espaços culturais por proximidade real, distrito,
              concelho, localidade ou pesquisa livre.
            </p>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Localização
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none">
              Perto de ti.
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              A localização automática pede autorização ao browser e só funciona
              em HTTPS. Se o browser mandar o ponto errado, usa uma morada
              manual guardada.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={handleLocationButtonClick}
                disabled={locationLoading}
                className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
              >
                {locationLoading
                  ? "A pedir autorização GPS..."
                  : userLocation
                    ? "Pedir GPS outra vez"
                    : "Pedir autorização GPS"}
              </button>

              {userLocation && (
                <button
                  type="button"
                  onClick={clearUserLocation}
                  className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                >
                  Desligar localização
                </button>
              )}

              {userLocationMapsUrl && (
                <a
                  href={userLocationMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-green-900 px-5 py-4 text-center text-sm font-bold text-green-400"
                >
                  Ver ponto automático no Maps
                </a>
              )}

              {savedManualLocation && userLocation?.source !== "manual" && (
                <button
                  type="button"
                  onClick={() =>
                    useSavedManualLocation(
                      radiusFilter === "all" ? "50" : radiusFilter
                    )
                  }
                  className="rounded-full border border-yellow-900 px-5 py-4 text-sm font-bold text-yellow-400"
                >
                  Usar morada guardada
                </button>
              )}
            </div>

            {savedManualLocation && (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Origem manual guardada
                </p>

                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {savedManualLocation.query || savedManualLocation.label}
                </p>

                <button
                  type="button"
                  onClick={forgetSavedManualLocation}
                  className="mt-3 text-xs font-bold text-zinc-500 underline"
                >
                  Esquecer esta origem
                </button>
              </div>
            )}

            <form
              className="mt-5 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                useManualLocation(radiusFilter === "all" ? "50" : radiusFilter);
              }}
            >
              <label className="text-sm font-bold text-zinc-300">
                Ou define a origem do raio
              </label>

              <input
                value={manualLocationQuery}
                onChange={(event) => setManualLocationQuery(event.target.value)}
                placeholder="Ex: Rua..., Pombal ou Leiria"
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />

              <button
                type="submit"
                disabled={locationLoading}
                className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300 disabled:opacity-50"
              >
                Usar e guardar esta origem
              </button>
            </form>

            <p
              className={`mt-5 rounded-2xl border p-4 text-sm ${
                userLocation
                  ? "border-green-900 bg-green-950/20 text-green-400"
                  : "border-zinc-800 bg-black text-zinc-500"
              }`}
            >
              {getLocationHint()}
            </p>
          </div>
        </section>

        {message && (
          <div className="mt-8 rounded-[2rem] border border-red-900 bg-red-950/20 p-5">
            <p className="text-sm font-bold text-red-300">{message}</p>
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[340px_1fr] lg:items-start">
          <aside className="space-y-6 lg:sticky lg:top-28">
            <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Filtros
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none">
                Afinar radar.
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Pesquisa
                  </label>

                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Evento, espaço, morada..."
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Raio
                  </label>

                  <select
                    value={radiusFilter}
                    onChange={(event) =>
                      handleRadiusChange(event.target.value as RadiusFilter)
                    }
                    disabled={locationLoading}
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50 focus:border-red-900"
                  >
                    <option value="all">Portugal inteiro</option>
                    <option value="5">Até 5 km</option>
                    <option value="15">Até 15 km</option>
                    <option value="50">Até 50 km</option>
                    <option value="150">Até 150 km</option>
                  </select>

                  {!userLocation && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Ao escolher um raio, o browser vai pedir a tua localização.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Distrito
                  </label>

                  <select
                    value={districtFilter}
                    onChange={(event) => handleDistrictChange(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    {districtOptions.map((district) => (
                      <option key={district}>{district}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Concelho
                  </label>

                  <select
                    value={municipalityFilter}
                    onChange={(event) =>
                      handleMunicipalityChange(event.target.value)
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    {municipalityOptions.map((municipality) => (
                      <option key={municipality}>{municipality}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Localidade
                  </label>

                  <select
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    disabled={cityOptions.length <= 1}
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50 focus:border-red-900"
                  >
                    {cityOptions.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>

                  {cityOptions.length <= 1 && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Ainda não há localidades publicadas para esta combinação.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Categoria
                  </label>

                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value)
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Data
                  </label>

                  <select
                    value={dateFilter}
                    onChange={(event) =>
                      setDateFilter(event.target.value as EventDateFilter)
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    {eventDateFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Preço
                  </label>

                  <select
                    value={priceFilter}
                    onChange={(event) =>
                      setPriceFilter(event.target.value as EventPriceFilter)
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    {eventPriceFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setOnlyWithLocation((current) => !current)}
                  className={`w-full rounded-full px-5 py-4 text-sm font-black ${
                    onlyWithLocation
                      ? "bg-[#f2f1ec] text-black"
                      : "border border-zinc-700 text-zinc-300"
                  }`}
                >
                  {onlyWithLocation
                    ? "Só com coordenadas"
                    : "Mostrar também sem coordenadas"}
                </button>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                >
                  Limpar filtros
                </button>

                <button
                  type="button"
                  onClick={loadMapData}
                  className="w-full rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500"
                >
                  Atualizar mapa
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Estado
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                  <p className="text-3xl font-black">{events.length}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Eventos
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                  <p className="text-3xl font-black">
                    {eventsWithCoordinatesCount}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Geo
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                  <p className="text-3xl font-black">
                    {portugalMunicipalities.length}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Concelhos
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                  <p className="text-3xl font-black">
                    {filteredEvents.length}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Visíveis
                  </p>
                </div>
              </div>

              {closestEvent && (
                <div className="mt-4 rounded-[1.5rem] border border-green-900 bg-green-950/20 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-green-500">
                    Mais perto
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {closestEvent.title}
                  </p>
                  <p className="mt-1 text-sm text-green-400">
                    {formatDistance(closestEvent.distanceKm)}
                  </p>
                </div>
              )}

              {!closestEvent &&
                userLocation &&
                radiusFilter !== "all" &&
                closestLocatedEvent && (
                  <div className="mt-4 rounded-[1.5rem] border border-yellow-900 bg-yellow-950/20 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-yellow-500">
                      Fora do raio
                    </p>
                    <p className="mt-2 text-lg font-black">
                      {closestLocatedEvent.title}
                    </p>
                    <p className="mt-1 text-sm text-yellow-400">
                      Evento mais próximo da localização automática:{" "}
                      {formatDistance(closestLocatedEvent.distanceKm)}
                    </p>
                  </div>
                )}
            </section>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Resultados
              </p>

              <h2 className="mt-3 text-5xl font-black leading-none lg:text-7xl">
                {userLocation && radiusFilter !== "all"
                  ? "Perto de ti."
                  : municipalityFilter !== "Todos"
                    ? municipalityFilter
                    : districtFilter !== "Todos"
                      ? districtFilter
                      : "Mapa nacional."}
              </h2>

              <p className="mt-4 text-sm text-zinc-500">
                {filteredEvents.length} evento
                {filteredEvents.length === 1 ? "" : "s"} visível
                {filteredEvents.length === 1 ? "" : "s"} · {getRadiusLabel()}.
              </p>
            </div>

            {filteredEvents.length === 0 && <EmptyState />}

            {filteredEvents.map((event) => {
              const ticket = ticketLabel(event.ticket_mode);
              const mapsUrl = buildGoogleMapsUrl(
                event.finalLatitude,
                event.finalLongitude,
                event.locationLabel
              );

              const eventCity = getEventCity(event);
              const eventMunicipality = getEventMunicipality(event);
              const eventDistrict = getEventDistrict(event);

              return (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950"
                >
                  <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
                    <Link
                      href={`/eventos/${event.slug}`}
                      className="block min-h-64 bg-zinc-900 bg-cover bg-center lg:min-h-full"
                      style={{
                        backgroundImage: event.image_url
                          ? `url(${event.image_url})`
                          : "radial-gradient(circle at top, #3f0d0d, #111)",
                      }}
                      aria-label={event.title}
                    />

                    <div className="p-5 lg:p-6">
                      <div className="flex flex-wrap gap-2">
                        {event.distanceKm !== null && (
                          <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-black uppercase text-green-400">
                            {formatDistance(event.distanceKm)}
                          </span>
                        )}

                        {event.featured && (
                          <span className="rounded-full border border-yellow-900 bg-yellow-950/20 px-3 py-1 text-xs font-black uppercase text-yellow-500">
                            Destaque
                          </span>
                        )}

                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black uppercase text-zinc-300">
                          {event.category || "Evento"}
                        </span>

                        {eventMunicipality && (
                          <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-black uppercase text-zinc-500">
                            {eventMunicipality}
                          </span>
                        )}

                        {ticket && (
                          <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-black uppercase text-green-400">
                            {ticket}
                          </span>
                        )}

                        {event.finalLatitude === null ||
                        event.finalLongitude === null ? (
                          <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-bold uppercase text-zinc-600">
                            Sem coordenadas
                          </span>
                        ) : null}
                      </div>

                      <Link href={`/eventos/${event.slug}`}>
                        <h3 className="mt-4 text-4xl font-black leading-none lg:text-6xl">
                          {event.title}
                        </h3>
                      </Link>

                      {event.description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                          {event.description}
                        </p>
                      )}

                      <div className="mt-5 grid gap-2 text-sm text-zinc-500 lg:grid-cols-2">
                        <p>
                          <span className="block text-xs font-black uppercase tracking-wide text-zinc-700">
                            Data
                          </span>
                          {event.display_date ||
                            formatDate(event.start_at || event.start_date)}
                          {event.is_multi_day && event.end_date
                            ? ` — ${formatShortDate(event.end_date)}`
                            : ""}
                        </p>

                        <p>
                          <span className="block text-xs font-black uppercase tracking-wide text-zinc-700">
                            Hora
                          </span>
                          {event.display_time || "Hora por definir"}
                        </p>

                        <p>
                          <span className="block text-xs font-black uppercase tracking-wide text-zinc-700">
                            Local
                          </span>
                          {event.venue_name || "Sem espaço"}
                        </p>

                        <p>
                          <span className="block text-xs font-black uppercase tracking-wide text-zinc-700">
                            Zona
                          </span>
                          {[eventCity, eventMunicipality, eventDistrict]
                            .filter(Boolean)
                            .join(" · ") || "Sem zona"}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/eventos/${event.slug}`}
                          className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
                        >
                          Ver evento
                        </Link>

                        {event.venue ? (
                          <Link
                            href={`/espacos/${event.venue.slug}`}
                            className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                          >
                            Ver espaço
                          </Link>
                        ) : null}

                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                        >
                          Abrir no mapa
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </section>
      </section>
    </main>
  );
}
