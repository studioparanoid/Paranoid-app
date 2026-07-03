"use client";

import { useEffect, useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { events } from "@/data/events";

export function ForYouClient() {
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPreferredCities(
      JSON.parse(localStorage.getItem("preferredCities") || "[]")
    );

    setPreferredCategories(
      JSON.parse(localStorage.getItem("preferredCategories") || "[]")
    );

    setLoaded(true);
  }, []);

  const recommendedEvents = useMemo(() => {
    return events.filter((event) => {
      const cityMatch =
        preferredCities.length === 0 || preferredCities.includes(event.city);

      const categoryMatch =
        preferredCategories.length === 0 ||
        preferredCategories.includes(event.category);

      return cityMatch && categoryMatch;
    });
  }, [preferredCities, preferredCategories]);

  if (!loaded) {
    return null;
  }

  if (preferredCities.length === 0 && preferredCategories.length === 0) {
    return (
      <section className="mt-10 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Para ti
        </p>

        <h2 className="text-2xl font-black">Ainda não te conhecemos.</h2>

        <p className="mt-2 text-sm text-zinc-500">
          Vai ao Perfil, escolhe cidades e categorias, e a Paranoid começa a
          apontar-te para o sítio certo.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Para ti
        </p>

        <h2 className="text-2xl font-black">A tua rota provável.</h2>

        <p className="mt-1 text-sm text-zinc-500">
          Eventos puxados pelas tuas cidades e categorias.
        </p>
      </div>

      {recommendedEvents.length > 0 ? (
        <div className="space-y-4">
          {recommendedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Nada encontrado para as tuas preferências. Ou estás demasiado à
            frente, ou a cidade ainda não acordou.
          </p>
        </div>
      )}
    </section>
  );
}