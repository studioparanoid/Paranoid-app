"use client";

import { useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { events } from "@/data/events";

const categories = ["Todos", ...Array.from(new Set(events.map((event) => event.category)))];
const cities = ["Todas", ...Array.from(new Set(events.map((event) => event.city)))];

export function AgendaClient() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedCity, setSelectedCity] = useState("Todas");
  const [search, setSearch] = useState("");

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return events.filter((event) => {
      const categoryMatch =
        selectedCategory === "Todos" || event.category === selectedCategory;

      const cityMatch = selectedCity === "Todas" || event.city === selectedCity;

      const artistsText = event.artists
        .map((artist) => artist.name)
        .join(" ")
        .toLowerCase();

      const searchableText = [
        event.title,
        event.city,
        event.venue,
        event.category,
        event.organizer,
        artistsText,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch =
        normalizedSearch === "" || searchableText.includes(normalizedSearch);

      return categoryMatch && cityMatch && searchMatch;
    });
  }, [selectedCategory, selectedCity, search]);

  return (
    <div className="mt-8">
      <div className="mb-6">
        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Pesquisa
        </label>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Procura evento, espaço, artista, cidade..."
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
        />
      </div>

      <div className="mb-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
          Categoria
        </p>

        <div className="flex gap-2 overflow-x-auto">
          {categories.map((category) => {
            const active = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
                  active
                    ? "border-red-800 bg-red-950 text-[#f2f1ec]"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
          Cidade
        </p>

        <div className="flex gap-2 overflow-x-auto">
          {cities.map((city) => {
            const active = selectedCity === city;

            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
                  active
                    ? "border-red-800 bg-red-950 text-[#f2f1ec]"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""} encontrado
        {filteredEvents.length !== 1 ? "s" : ""}.
      </p>

      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-zinc-400">
            Nada encontrado. Ou escreveste mal, ou a cidade ainda está morta.
          </p>
        </div>
      )}
    </div>
  );
}