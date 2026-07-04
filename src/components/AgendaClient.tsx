"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type AppEvent } from "@/lib/events";

type AgendaClientProps = {
  events?: AppEvent[];
};

type FilterValue = "Todos";

function normalize(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function EventCard({ event, large = false }: { event: AppEvent; large?: boolean }) {
  return (
    <Link
      href={`/eventos/${event.slug}`}
      className={`block h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950 ${
        large ? "lg:rounded-[2.5rem] lg:p-6" : ""
      }`}
    >
      {event.image && (
        <div
          className={`mb-4 rounded-[1.5rem] bg-cover bg-center ${
            large ? "h-64 lg:h-96" : "h-56 lg:h-52"
          }`}
          style={{
            backgroundImage: `url(${event.image})`,
          }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            {event.category || "Evento"}
          </p>

          <h3
            className={`mt-2 font-black leading-tight text-[#f2f1ec] ${
              large ? "text-3xl lg:text-5xl" : "text-2xl"
            }`}
          >
            {event.title}
          </h3>
        </div>

        {event.featured && (
          <span className="shrink-0 rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
            Destaque
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1 text-sm text-zinc-400">
        <p>
          <span className="font-bold text-zinc-300">Data:</span>{" "}
          {event.date || "Data por definir"}{" "}
          {event.time ? `· ${event.time}` : ""}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Cidade:</span>{" "}
          {event.city || "Cidade por definir"}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Espaço:</span>{" "}
          {event.venue || "Espaço por definir"}
        </p>

        {event.price && (
          <p>
            <span className="font-bold text-zinc-300">Preço:</span>{" "}
            {event.price}
          </p>
        )}
      </div>

      {event.description && large && (
        <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {event.description}
        </p>
      )}
    </Link>
  );
}

export function AgendaClient({ events = [] }: AgendaClientProps) {
  const safeEvents = Array.isArray(events) ? events : [];

  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string | FilterValue>("Todos");
  const [category, setCategory] = useState<string | FilterValue>("Todos");
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  const cities = useMemo(() => {
    return Array.from(
      new Set(safeEvents.map((event) => event.city).filter(Boolean))
    ).sort();
  }, [safeEvents]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(safeEvents.map((event) => event.category).filter(Boolean))
    ).sort();
  }, [safeEvents]);

  const filteredEvents = useMemo(() => {
    const cleanSearch = normalize(search);

    return safeEvents.filter((event) => {
      const matchesSearch =
        !cleanSearch ||
        normalize(
          [
            event.title,
            event.city,
            event.venue,
            event.organizer,
            event.category,
            event.description,
            event.price,
          ].join(" ")
        ).includes(cleanSearch);

      const matchesCity = city === "Todos" || event.city === city;
      const matchesCategory =
        category === "Todos" || event.category === category;
      const matchesFeatured = !onlyFeatured || event.featured;

      return matchesSearch && matchesCity && matchesCategory && matchesFeatured;
    });
  }, [safeEvents, search, city, category, onlyFeatured]);

  const featuredEvent = filteredEvents.find((event) => event.featured) || null;
  const normalEvents = featuredEvent
    ? filteredEvents.filter((event) => event.id !== featuredEvent.id)
    : filteredEvents;

  function clearFilters() {
    setSearch("");
    setCity("Todos");
    setCategory("Todos");
    setOnlyFeatured(false);
  }

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-8">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Filtros
          </p>

          <h2 className="mt-3 text-3xl font-black">Afina a noite.</h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Pesquisa
              </label>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, espaço, cidade..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Cidade
              </label>

              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              >
                <option>Todos</option>

                {cities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Categoria
              </label>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              >
                <option>Todos</option>

                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
              <input
                type="checkbox"
                checked={onlyFeatured}
                onChange={(event) => setOnlyFeatured(event.target.checked)}
              />

              <span className="text-sm font-bold text-zinc-300">
                Só destaques
              </span>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
            >
              Limpar filtros
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{filteredEvents.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Resultados
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{safeEvents.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Total
              </p>
            </div>
          </div>
        </aside>

        <section>
          {filteredEvents.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">
                Não encontrei eventos com esses filtros.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {featuredEvent && (
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Destaque
                  </p>

                  <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                    Em cima da mesa
                  </h2>
                </div>
              </div>

              <div className="mt-5">
                <EventCard event={featuredEvent} large />
              </div>
            </div>
          )}

          {normalEvents.length > 0 && (
            <div className={featuredEvent ? "mt-10" : ""}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Lista
                  </p>

                  <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                    Próximos eventos
                  </h2>
                </div>

                <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                  {normalEvents.length}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {normalEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}