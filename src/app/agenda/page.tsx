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
  getEventDistrict,
  getEventMunicipality,
  getDistrictOptions,
  getMunicipalityOptions,
} from "@/lib/eventFilters";
import { portugalMunicipalities } from "@/lib/portugalLocations";
import { supabase } from "@/lib/supabase/public";

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

function formatFullDate(value: string | null | undefined) {
  if (!value) {
    return "Data por definir";
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

function sortEvents(first: EventRow, second: EventRow) {
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

function EmptyState() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Sem eventos
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        A agenda está limpa.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        Ainda não há eventos publicados com estes filtros.
      </p>

      <Link
        href="/submeter"
        className="mt-8 inline-block rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
      >
        Submeter evento
      </Link>
    </section>
  );
}

export default function AgendaPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [events, setEvents] = useState<EventRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS);
  const [municipalityFilter, setMunicipalityFilter] =
    useState(ALL_MUNICIPALITIES);
  const [cityFilter, setCityFilter] = useState(ALL_CITIES);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [dateFilter, setDateFilter] = useState<EventDateFilter>("all");
  const [priceFilter, setPriceFilter] = useState<EventPriceFilter>("all");
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  async function loadEvents() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("events")
      .select(
        "id,slug,title,status,city,municipality,district,address,postal_code,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_price"
      )
      .eq("status", "published")
      .order("start_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents((data || []) as EventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const indexedEvents = useMemo(() => {
    return events.map((event) => buildEventFilterIndex(event));
  }, [events]);

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
    return filterIndexedEvents(indexedEvents, {
      searchQuery,
      districtFilter,
      municipalityFilter,
      cityFilter,
      categoryFilter,
      dateFilter,
      priceFilter,
      onlyFeatured,
    })
      .map((indexedEvent) => indexedEvent.event)
      .sort(sortEvents);
  }, [
    indexedEvents,
    searchQuery,
    districtFilter,
    municipalityFilter,
    cityFilter,
    categoryFilter,
    dateFilter,
    priceFilter,
    onlyFeatured,
  ]);

  const featuredEvents = useMemo(() => {
    return events.filter((event) => event.featured).slice(0, 3);
  }, [events]);

  const municipalityCount = useMemo(() => {
    return portugalMunicipalities.length;
  }, []);

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
    setSearchQuery("");
    setDistrictFilter(ALL_DISTRICTS);
    setMunicipalityFilter(ALL_MUNICIPALITIES);
    setCityFilter(ALL_CITIES);
    setCategoryFilter(ALL_CATEGORIES);
    setDateFilter("all");
    setPriceFilter("all");
    setOnlyFeatured(false);
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Agenda
            </p>

            <h1 className="text-6xl font-black leading-none tracking-tight lg:text-9xl">
              Próximos ruídos.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Eventos publicados pela Paranoid. Filtra por distrito, concelho,
              localidade, categoria ou pesquisa direta.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{events.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Publicados
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{municipalityCount}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Concelhos
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{featuredEvents.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Destaques
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{filteredEvents.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Visíveis
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-8 rounded-[2rem] border border-red-900 bg-red-950/20 p-5">
            <p className="text-sm font-bold text-red-300">{message}</p>
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[320px_1fr] lg:items-start">
          <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Filtros
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none">
              Escolhe a zona.
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
                  onChange={(event) => setCategoryFilter(event.target.value)}
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
                onClick={() => setOnlyFeatured((current) => !current)}
                className={`w-full rounded-full px-5 py-4 text-sm font-black ${
                  onlyFeatured
                    ? "bg-[#f2f1ec] text-black"
                    : "border border-zinc-700 text-zinc-300"
                }`}
              >
                Só destaques
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
                onClick={loadEvents}
                className="w-full rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500"
              >
                Atualizar agenda
              </button>

              <Link
                href="/submeter"
                className="block rounded-full border border-red-900 px-5 py-4 text-center text-sm font-bold text-red-300"
              >
                Submeter evento
              </Link>
            </div>
          </aside>

          <section className="space-y-5">
            {loading && (
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-500">A carregar agenda...</p>
              </div>
            )}

            {!loading && filteredEvents.length === 0 && <EmptyState />}

            {!loading &&
              filteredEvents.map((event) => {
                const ticket = ticketLabel(event.ticket_mode);
                const eventDistrict = getEventDistrict(event);
                const eventMunicipality = getEventMunicipality(event);
                const zone = [event.city, eventMunicipality, eventDistrict]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <article
                    key={event.id}
                    className="overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950"
                  >
                    <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
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

                      <div className="p-5 lg:p-7">
                        <div className="flex flex-wrap gap-2">
                          {event.featured && (
                            <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-black uppercase text-red-300">
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
                        </div>

                        <Link href={`/eventos/${event.slug}`}>
                          <h2 className="mt-5 text-4xl font-black leading-none lg:text-6xl">
                            {event.title}
                          </h2>
                        </Link>

                        <div className="mt-5 grid gap-3 text-sm text-zinc-400 lg:grid-cols-2">
                          <p>
                            <span className="block text-xs font-black uppercase tracking-wide text-zinc-600">
                              Data
                            </span>
                            {event.display_date ||
                              formatDate(event.start_at || event.start_date)}
                            {event.is_multi_day && event.end_date
                              ? ` — ${formatFullDate(event.end_date)}`
                              : ""}
                          </p>

                          <p>
                            <span className="block text-xs font-black uppercase tracking-wide text-zinc-600">
                              Hora
                            </span>
                            {event.display_time || "Hora por definir"}
                          </p>

                          <p>
                            <span className="block text-xs font-black uppercase tracking-wide text-zinc-600">
                              Zona
                            </span>
                            {zone || "Sem zona"}
                          </p>

                          <p>
                            <span className="block text-xs font-black uppercase tracking-wide text-zinc-600">
                              Espaço
                            </span>
                            {event.venue_name || "Sem espaço"}
                          </p>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-400">
                            {event.price ||
                              event.ticket_price ||
                              "Preço por definir"}
                          </span>

                          {event.organizer_name && (
                            <span className="rounded-full border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-500">
                              {event.organizer_name}
                            </span>
                          )}

                          {event.postal_code && (
                            <span className="rounded-full border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-600">
                              {event.postal_code}
                            </span>
                          )}
                        </div>

                        {event.description && (
                          <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-zinc-500">
                            {event.description}
                          </p>
                        )}

                        <Link
                          href={`/eventos/${event.slug}`}
                          className="mt-6 inline-block rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
                        >
                          Ver evento
                        </Link>
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
