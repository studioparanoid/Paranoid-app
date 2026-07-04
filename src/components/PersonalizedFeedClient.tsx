"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";

type PersonalizedFeedClientProps = {
  events?: AppEvent[];
};

type ProfileRow = {
  preferred_cities: string[] | null;
  preferred_categories: string[] | null;
};

type SavedEventRow = {
  event_id: string;
};

type FollowRow = {
  id: string;
  target_type: string;
  target_id: string;
};

type ScoredEvent = AppEvent & {
  score: number;
  reasons: string[];
};

function getLocalSavedEvents() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem("paranoid_saved_events");

    if (!value) {
      return [];
    }

    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

function scoreEvent({
  event,
  preferredCities,
  preferredCategories,
  savedEventIds,
}: {
  event: AppEvent;
  preferredCities: string[];
  preferredCategories: string[];
  savedEventIds: string[];
}) {
  let score = 0;
  const reasons: string[] = [];

  if (savedEventIds.includes(event.id)) {
    score += 50;
    reasons.push("Guardado");
  }

  if (preferredCities.includes(event.city)) {
    score += 35;
    reasons.push(event.city);
  }

  if (preferredCategories.includes(event.category)) {
    score += 35;
    reasons.push(event.category);
  }

  if (event.featured) {
    score += 15;
    reasons.push("Destaque");
  }

  if (event.price?.toLowerCase().includes("entrada livre")) {
    score += 5;
    reasons.push("Entrada livre");
  }

  return {
    ...event,
    score,
    reasons: Array.from(new Set(reasons)),
  };
}

function EventCard({ event }: { event: ScoredEvent }) {
  return (
    <article className="h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950">
      {event.image && (
        <Link
          href={`/eventos/${event.slug}`}
          className="mb-4 block h-56 rounded-[1.5rem] bg-cover bg-center lg:h-52"
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

          <Link href={`/eventos/${event.slug}`}>
            <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
              {event.title}
            </h3>
          </Link>
        </div>

        {event.score > 0 && (
          <span className="shrink-0 rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
            {event.score}
          </span>
        )}
      </div>

      {event.reasons.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.reasons.slice(0, 4).map((reason) => (
            <span
              key={reason}
              className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold text-zinc-400"
            >
              {reason}
            </span>
          ))}
        </div>
      )}

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

      {event.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {event.description}
        </p>
      )}

      <Link
        href={`/eventos/${event.slug}`}
        className="mt-5 block rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
      >
        Ver evento
      </Link>
    </article>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-zinc-500">{text}</p>
    </div>
  );
}

export function PersonalizedFeedClient({
  events = [],
}: PersonalizedFeedClientProps) {
  const safeEvents = Array.isArray(events) ? events : [];

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [followsCount, setFollowsCount] = useState(0);

  useEffect(() => {
    async function loadPersonalData() {
      setLoading(true);
      setMessage("");

      const localSavedIds = getLocalSavedEvents();
      const validLocalSavedIds = localSavedIds.filter((eventId) =>
        safeEvents.some((event) => event.id === eventId)
      );

      setSavedEventIds(validLocalSavedIds);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("preferred_cities,preferred_categories")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        const profile = profileData as ProfileRow;

        setPreferredCities(profile.preferred_cities || []);
        setPreferredCategories(profile.preferred_categories || []);
      }

      const { data: savedRows } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id);

      const dbSavedIds = ((savedRows || []) as SavedEventRow[])
        .map((row) => row.event_id)
        .filter((eventId) => safeEvents.some((event) => event.id === eventId));

      setSavedEventIds(Array.from(new Set([...validLocalSavedIds, ...dbSavedIds])));

      const { data: followRows } = await supabase
        .from("follows")
        .select("id,target_type,target_id")
        .eq("user_id", user.id);

      setFollowsCount(((followRows || []) as FollowRow[]).length);

      setLoading(false);
    }

    loadPersonalData();
  }, [safeEvents]);

  const scoredEvents = useMemo(() => {
    return safeEvents
      .map((event) =>
        scoreEvent({
          event,
          preferredCities,
          preferredCategories,
          savedEventIds,
        })
      )
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        if (Number(b.featured) !== Number(a.featured)) {
          return Number(b.featured) - Number(a.featured);
        }

        return a.title.localeCompare(b.title);
      });
  }, [safeEvents, preferredCities, preferredCategories, savedEventIds]);

  const hasPersonalSignals =
    preferredCities.length > 0 ||
    preferredCategories.length > 0 ||
    savedEventIds.length > 0 ||
    followsCount > 0;

  const strongMatches = scoredEvents.filter((event) => event.score > 0);
  const fallbackEvents = scoredEvents.slice(0, 9);

  const visibleEvents =
    strongMatches.length > 0 ? strongMatches.slice(0, 12) : fallbackEvents;

  const featuredMatches = visibleEvents.filter((event) => event.featured);
  const normalMatches = visibleEvents.filter((event) => !event.featured);

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Radar
          </p>

          <h2 className="mt-3 text-3xl font-black">O teu filtro.</h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            O feed usa cidades, categorias, guardados e sinais da tua conta.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{preferredCities.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Cidades
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">
                {preferredCategories.length}
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Cenas
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{savedEventIds.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Guard.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{followsCount}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Seg.
              </p>
            </div>
          </div>

          {!userId && (
            <div className="mt-6 rounded-[1.5rem] border border-yellow-900 bg-yellow-950/20 p-4">
              <p className="text-sm leading-relaxed text-yellow-500">
                Sem sessão, o feed usa só guardados locais e eventos em
                destaque.
              </p>
            </div>
          )}

          {userId && !hasPersonalSignals && (
            <div className="mt-6 rounded-[1.5rem] border border-red-950 bg-red-950/20 p-4">
              <p className="text-sm leading-relaxed text-red-300">
                Ainda tens pouco sinal. Define preferências no perfil para isto
                ficar melhor.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <Link
              href="/perfil"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Afinar perfil
            </Link>

            <Link
              href="/agenda"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Ver agenda toda
            </Link>
          </div>

          {message && (
            <p className="mt-4 text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}
        </aside>

        <section>
          {loading && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">A preparar feed...</p>
            </div>
          )}

          {!loading && visibleEvents.length === 0 && (
            <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Vazio
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                Ainda não há nada para puxar.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400 lg:text-base">
                Quando houver eventos publicados, guardados ou preferências no
                teu perfil, esta página ganha vida.
              </p>

              <Link
                href="/agenda"
                className="mt-6 inline-block rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
              >
                Abrir agenda
              </Link>
            </div>
          )}

          {!loading && visibleEvents.length > 0 && (
            <div className="space-y-10">
              {!hasPersonalSignals && (
                <section className="rounded-[2.5rem] border border-red-950 bg-red-950/20 p-6 lg:p-8">
                  <p className="text-xs uppercase tracking-[0.3em] text-red-500">
                    Feed base
                  </p>

                  <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                    Ainda não é muito teu.
                  </h2>

                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 lg:text-base">
                    Estamos a mostrar eventos em destaque e próximos. Guarda
                    eventos ou define preferências para o feed ficar mais
                    pessoal.
                  </p>
                </section>
              )}

              {featuredMatches.length > 0 && (
                <section>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                        Destaques
                      </p>

                      <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                        Provavelmente interessa
                      </h2>
                    </div>

                    <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                      {featuredMatches.length}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {featuredMatches.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                      Feed
                    </p>

                    <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                      Escolhidos pelo radar
                    </h2>
                  </div>

                  <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                    {normalMatches.length}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {normalMatches.length === 0 && (
                    <EmptyCard text="Sem mais eventos fora dos destaques." />
                  )}

                  {normalMatches.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}