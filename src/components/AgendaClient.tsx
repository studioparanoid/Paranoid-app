"use client";

import { useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { events } from "@/data/events";

const categories = ["Todos", ...Array.from(new Set(events.map((event) => event.category)))];
const cities = ["Todas", ...Array.from(new Set(events.map((event) => event.city)))];

export function AgendaClient() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedCity, setSelectedCity] = useState("Todas");

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const categoryMatch =
        selectedCategory === "Todos" || event.category === selectedCategory;

      const cityMatch = selectedCity === "Todas" || event.city === selectedCity;

      return categoryMatch && cityMatch;
    });
  }, [selectedCategory, selectedCity]);

  return (
    <div className="mt-8">
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
            Nada encontrado. A cidade está morta ou os filtros estão demasiado apertados.
          </p>
        </div>
      )}
    </div>
  );
}