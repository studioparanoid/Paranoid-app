"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";

const cityOptions = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

const categoryOptions = [
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

type PersonalizedFeedClientProps = {
  events?: AppEvent[];
};

type ProfilePreferences = {
  preferred_cities: string[] | null;
  preferred_categories: string[] | null;
};

type FollowRow = {
  target_type: string;
  target_id: string;
};

function getLocalArray(key: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(key);

    if (!value) {
      return [];
    }

    const parsedValue = JSON.parse(value);

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function saveLocalArray(key: string, value: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora localStorage bloqueado.
  }
}

function normalize(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreEvent(
  event: AppEvent,
  preferredCities: string[],
  preferredCategories: string[],
  followedNames: string[],
  savedEventIds: string[]
) {
  let score = 0;

  if (event.featured) {
    score += 20;
  }

  if (preferredCities.includes(event.city)) {
    score += 15;
  }

  if (preferredCategories.includes(event.category)) {
    score += 15;
  }

  if (savedEventIds.includes(event.id)) {
    score += 5;
  }

  const eventText = normalize(
    `${event.title} ${event.venue} ${event.organizer} ${event.description}`
  );

  for (const followedName of followedNames) {
    if (eventText.includes(normalize(followedName))) {
      score += 20;
    }
  }

  return score;
}

export function PersonalizedFeedClient({
  events = [],
}: PersonalizedFeedClientProps) {
  const safeEvents = Array.isArray(events) ? events : [];

  const [loading, setLoading] = useState(true);
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [followedNames, setFollowedNames] = useState<string[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadPersonalData() {
      setLoading(true);

      const localCities = getLocalArray("paranoid_preferred_cities");
      const localCategories = getLocalArray("paranoid_preferred_categories");
      const localSavedIds = getLocalArray("paranoid_saved_events");

      setPreferredCities(localCities);
      setPreferredCategories(localCategories);
      setSavedEventIds(localSavedIds);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("preferred_cities,preferred_categories")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        const profile = profileData as ProfilePreferences;

        const cities = Array.isArray(profile.preferred_cities)
          ? profile.preferred_cities
          : [];

        const categories = Array.isArray(profile.preferred_categories)
          ? profile.preferred_categories
          : [];

        setPreferredCities(cities);
        setPreferredCategories(categories);

        saveLocalArray("paranoid_preferred_cities", cities);
        saveLocalArray("paranoid_preferred_categories", categories);
      }

      const { data: savedRows } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id);

      if (Array.isArray(savedRows)) {
        const dbSavedIds = savedRows
          .map((row) => String(row.event_id || ""))
          .filter(Boolean);

        setSavedEventIds(dbSavedIds);
        saveLocalArray("paranoid_saved_events", dbSavedIds);
      }

      const { data: followsData } = await supabase
        .from("follows")
        .select("target_type,target_id")
        .eq("user_id", user.id);

      const follows = Array.isArray(followsData)
        ? ((followsData || []) as FollowRow[])
        : [];

      const names = follows
        .map((follow) => String(follow.target_id || ""))
        .filter(Boolean);

      setFollowedNames(names);

      setLoading(false);
    }

    loadPersonalData();
  }, []);

  const recommendedEvents = useMemo(() => {
    return safeEvents
      .map((event) => ({
        event,
        score: scoreEvent(
          event,
          preferredCities,
          preferredCategories,
          followedNames,
          savedEventIds
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.event);
  }, [
    safeEvents,
    preferredCities,
    preferredCategories,
    followedNames,
    savedEventIds,
  ]);

  const hasPreferences =
    preferredCities.length > 0 ||
    preferredCategories.length > 0 ||
    followedNames.length > 0 ||
    savedEventIds.length > 0;

  function toggleCity(city: string) {
    const nextCities = preferredCities.includes(city)
      ? preferredCities.filter((item) => item !== city)
      : [...preferredCities, city];

    setPreferredCities(nextCities);
    saveLocalArray("paranoid_preferred_cities", nextCities);
  }

  function toggleCategory(category: string) {
    const nextCategories = preferredCategories.includes(category)
      ? preferredCategories.filter((item) => item !== category)
      : [...preferredCategories, category];

    setPreferredCategories(nextCategories);
    saveLocalArray("paranoid_preferred_categories", nextCategories);
  }

  async function savePreferences() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await supabase
      .from("profiles")
      .update({
        preferred_cities: preferredCities,
        preferred_categories: preferredCategories,
      })
      .eq("id", user.id);
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-red-700">
          Afinação
        </p>

        <h2 className="mt-3 text-2xl font-black">Diz ao feed ao que vens.</h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Escolhe cidades e categorias. A Paranoid puxa para cima o que bate
          mais com isso.
        </p>

        <div className="mt-5">
          <p className="mb-3 text-sm font-bold text-zinc-300">Cidades</p>

          <div className="flex flex-wrap gap-2">
            {cityOptions.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                className={`rounded-full border px-3 py-2 text-xs font-black ${
                  preferredCities.includes(city)
                    ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                    : "border-zinc-800 bg-black text-zinc-400"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-sm font-bold text-zinc-300">Categorias</p>

          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-full border px-3 py-2 text-xs font-black ${
                  preferredCategories.includes(category)
                    ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                    : "border-zinc-800 bg-black text-zinc-400"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={savePreferences}
          className="mt-6 w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
        >
          Guardar preferências
        </button>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Para ti
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {hasPreferences ? "Recomendado" : "Começa por aqui"}
            </h2>
          </div>

          <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
            {recommendedEvents.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {loading && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">A afinar o feed...</p>
            </div>
          )}

          {!loading && recommendedEvents.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">
                Ainda não há eventos publicados para recomendar.
              </p>
            </div>
          )}

          {!loading &&
            recommendedEvents.map((event) => (
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