"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type RadiusFilter = "5" | "15" | "50" | "150" | "all";

type UserLocation = {
  latitude: number;
  longitude: number;
};

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
  latitude: number | null;
  longitude: number | null;
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
  latitude: number | null;
  longitude: number | null;
};

type EventWithLocation = EventRow & {
  venue: VenueRow | null;
  finalLatitude: number | null;
  finalLongitude: number | null;
  distanceKm: number | null;
  locationLabel: string;
};

function normalizeName(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

function distanceInKm(first: UserLocation, second: UserLocation) {
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

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-PT")
  );
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
        Aumenta o raio, muda o concelho/localidade ou vê Portugal inteiro.
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

  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("Todas");
  const [municipalityFilter, setMunicipalityFilter] = useState("Todos");
  const [districtFilter, setDistrictFilter] = useState("Todos");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
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
      map.set(normalizeName(venue.name), venue);
    });

    return map;
  }, [venues]);

  const eventsWithLocation = useMemo<EventWithLocation[]>(() => {
    return events.map((event) => {
      const venue =
        (event.venue_id ? venueById.get(event.venue_id) || null : null) ||
        venueByName.get(normalizeName(event.venue_name)) ||
        null;

      const finalLatitude =
        event.latitude !== null && event.latitude !== undefined
          ? event.latitude
          : venue?.latitude ?? null;

      const finalLongitude =
        event.longitude !== null && event.longitude !== undefined
          ? event.longitude
          : venue?.longitude ?? null;

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

  const cityOptions = useMemo(() => {
    const cities = eventsWithLocation
      .map((event) => event.city || event.venue?.city || "")
      .filter(Boolean);

    return ["Todas", ...uniqueSorted(cities)];
  }, [eventsWithLocation]);

  const municipalityOptions = useMemo(() => {
    const municipalities = eventsWithLocation
      .map((event) => event.municipality || event.venue?.municipality || "")
      .filter(Boolean);

    return ["Todos", ...uniqueSorted(municipalities)];
  }, [eventsWithLocation]);

  const districtOptions = useMemo(() => {
    const districts = eventsWithLocation
      .map((event) => event.district || event.venue?.district || "")
      .filter(Boolean);

    return ["Todos", ...uniqueSorted(districts)];
  }, [eventsWithLocation]);

  const categoryOptions = useMemo(() => {
    const categories = eventsWithLocation
      .map((event) => event.category || "")
      .filter(Boolean);

    return ["Todas", ...uniqueSorted(categories)];
  }, [eventsWithLocation]);

  const filteredEvents = useMemo(() => {
    const cleanSearch = normalizeName(searchQuery);

    return eventsWithLocation
      .filter((event) => {
        const hasCoordinates =
          event.finalLatitude !== null && event.finalLongitude !== null;

        if (onlyWithLocation && !hasCoordinates) {
          return false;
        }

        if (radiusFilter !== "all" && !hasCoordinates) {
          return false;
        }

        if (cityFilter !== "Todas") {
          const city = event.city || event.venue?.city || "";

          if (city !== cityFilter) {
            return false;
          }
        }

        if (municipalityFilter !== "Todos") {
          const municipality =
            event.municipality || event.venue?.municipality || "";

          if (municipality !== municipalityFilter) {
            return false;
          }
        }

        if (districtFilter !== "Todos") {
          const district = event.district || event.venue?.district || "";

          if (district !== districtFilter) {
            return false;
          }
        }

        if (categoryFilter !== "Todas" && event.category !== categoryFilter) {
          return false;
        }

        if (cleanSearch) {
          const searchableText = normalizeName(
            [
              event.title,
              event.venue_name,
              event.organizer_name,
              event.description,
              event.address,
              event.postal_code,
              event.city,
              event.municipality,
              event.district,
              event.venue?.name,
              event.venue?.address,
              event.venue?.postal_code,
              event.venue?.city,
              event.venue?.municipality,
              event.venue?.district,
            ]
              .filter(Boolean)
              .join(" ")
          );

          if (!searchableText.includes(cleanSearch)) {
            return false;
          }
        }

        if (userLocation && radiusFilter !== "all") {
          if (event.distanceKm === null) {
            return false;
          }

          return event.distanceKm <= Number(radiusFilter);
        }

        return true;
      })
      .sort(sortEvents);
  }, [
    eventsWithLocation,
    onlyWithLocation,
    radiusFilter,
    cityFilter,
    municipalityFilter,
    districtFilter,
    categoryFilter,
    searchQuery,
    userLocation,
  ]);

  const eventsWithCoordinatesCount = eventsWithLocation.filter(
    (event) => event.finalLatitude !== null && event.finalLongitude !== null
  ).length;

  const municipalityCount = municipalityOptions.length - 1;

  const closestEvent = filteredEvents.find(
    (event) => event.distanceKm !== null
  );

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

  function requestLocation() {
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("O teu browser não suporta localização.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (radiusFilter === "all") {
          setRadiusFilter("50");
        }

        setLocationLoading(false);
      },
      () => {
        setMessage(
          "Não deu para obter a tua localização. Podes usar os filtros por concelho, localidade ou distrito."
        );

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
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
              Eventos e espaços culturais por proximidade, concelho,
              localidade, distrito ou pesquisa livre.
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
              A localização é usada só no browser para calcular distância. Não é
              guardada na base de dados.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationLoading}
                className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
              >
                {locationLoading
                  ? "A pedir localização..."
                  : userLocation
                    ? "Atualizar localização"
                    : "Usar a minha localização"}
              </button>

              {userLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setUserLocation(null);
                    setRadiusFilter("all");
                  }}
                  className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                >
                  Desligar localização
                </button>
              )}
            </div>

            {userLocation && (
              <p className="mt-5 rounded-2xl border border-green-900 bg-green-950/20 p-4 text-sm text-green-400">
                Localização ativa. A mostrar eventos por distância real.
              </p>
            )}
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
                      setRadiusFilter(event.target.value as RadiusFilter)
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    <option value="all">Portugal inteiro</option>
                    <option value="5">Até 5 km</option>
                    <option value="15">Até 15 km</option>
                    <option value="50">Até 50 km</option>
                    <option value="150">Até 150 km</option>
                  </select>

                  {!userLocation && radiusFilter !== "all" && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Para calcular raio real, ativa a tua localização.
                    </p>
                  )}

                  {radiusFilter !== "all" && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Eventos sem coordenadas só aparecem em Portugal inteiro.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Concelho
                  </label>

                  <select
                    value={municipalityFilter}
                    onChange={(event) =>
                      setMunicipalityFilter(event.target.value)
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
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    {cityOptions.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Distrito
                  </label>

                  <select
                    value={districtFilter}
                    onChange={(event) => setDistrictFilter(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                  >
                    {districtOptions.map((district) => (
                      <option key={district}>{district}</option>
                    ))}
                  </select>
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
                  onClick={() => {
                    setRadiusFilter("all");
                    setSearchQuery("");
                    setCityFilter("Todas");
                    setMunicipalityFilter("Todos");
                    setDistrictFilter("Todos");
                    setCategoryFilter("Todas");
                    setOnlyWithLocation(false);
                  }}
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
                  <p className="text-3xl font-black">{municipalityCount}</p>
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
                    : "Mapa nacional."}
              </h2>

              <p className="mt-4 text-sm text-zinc-500">
                {filteredEvents.length} evento
                {filteredEvents.length === 1 ? "" : "s"} visível
                {filteredEvents.length === 1 ? "" : "s"}.
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

              const eventCity = event.city || event.venue?.city || "";
              const eventMunicipality =
                event.municipality || event.venue?.municipality || "";
              const eventDistrict =
                event.district || event.venue?.district || "";

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