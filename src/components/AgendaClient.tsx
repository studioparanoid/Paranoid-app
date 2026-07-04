"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type AppEvent } from "@/lib/events";

const categories = [
  "Todos",
  "Concertos",
  "Festivais",
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
  "Teatro",
  "Outros",
];

const cities = [
  "Todas",
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

type AgendaClientProps = {
  events?: AppEvent[];
};

function normalize(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function eventMatchesSearch(event: AppEvent, search: string) {
  const cleanSearch = normalize(search);

  if (!cleanSearch) {
    return true;
  }

  const searchableText = normalize(
    [
      event.title,
      event.city,
      event.venue,
      event.organizer,
      event.category,
      event.price,
      event.description,
      event.date,
      event.time,
    ].join(" ")
  );

  return searchableText.includes(cleanSearch);
}

export function AgendaClient({ events = [] }: AgendaClientProps) {
  const safeEvents = Array.isArray(events) ? events : [];

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedCity, setSelectedCity] = useState("Todas");
  const [search, setSearch] = useState("");

  const filteredEvents = useMemo(() => {
    return safeEvents.filter((event) => {
      const matchesCategory =
        selectedCategory === "Todos" || event.category === selectedCategory;

      const matchesCity =
        selectedCity === "Todas" || event.city === selectedCity;

      const matchesSearch = eventMatchesSearch(event, search);

      return matchesCategory && matchesCity && matchesSearch;
    });
  }, [safeEvents, selectedCategory, selectedCity, search]);

  return (
    <div className="mt-8 space-y-7">
      <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-4">
        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Pesquisa
        </label>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome, cidade, espaço, artista..."
          className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
        />
      </div>

      <section>
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          Categorias
        </p>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${
                selectedCategory === category
                  ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          Cidade
        </p>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${
                selectedCity === city
                  ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Eventos
            </p>

            <h2 className="mt-2 text-3xl font-black">Agenda ativa</h2>
          </div>

          <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
            {filteredEvents.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {filteredEvents.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">
                Não há eventos publicados com estes filtros.
              </p>
            </div>
          )}

          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              href={`/eventos/${event.slug}`}
              className="block rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
            >
              {event.image && (
                <div
                  className="mb-4 h-56 rounded-[1.5rem] bg-cover bg-center"
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

                  <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
                    {event.title}
                  </h3>
                </div>

                {event.featured && (
                  <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
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

                <p>
                  <span className="font-bold text-zinc-300">
                    Organizador:
                  </span>{" "}
                  {event.organizer || "Organizador por definir"}
                </p>

                {event.price && (
                  <p>
                    <span className="font-bold text-zinc-300">Preço:</span>{" "}
                    {event.price}
                  </p>
                )}
              </div>

              {event.description && (
                <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
                  {event.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}