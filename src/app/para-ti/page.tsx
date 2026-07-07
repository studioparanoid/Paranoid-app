"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  account_type: string | null;
  account_status: string | null;
  preferred_cities: string[] | null;
  preferred_categories: string[] | null;
};

type FollowRow = {
  id: string;
  user_id: string;
  target_type: "artist" | "organizer" | "venue";
  target_id: string;
};

type EventArtistRow = {
  event_id: string;
  artist_id: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  city: string | null;
  venue_id: string | null;
  venue_name: string | null;
  organizer_id: string | null;
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

type ScoredEvent = EventRow & {
  score: number;
  reasons: string[];
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

function sortByDate(first: EventRow, second: EventRow) {
  const firstDate = eventDateValue(first);
  const secondDate = eventDateValue(second);

  if (!firstDate && !secondDate) {
    return 0;
  }

  if (!firstDate) {
    return 1;
  }

  if (!secondDate) {
    return -1;
  }

  return new Date(firstDate).getTime() - new Date(secondDate).getTime();
}

function uniqueReasons(reasons: string[]) {
  return Array.from(new Set(reasons)).slice(0, 4);
}

function EmptyState() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Sem recomendações
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        Ainda não temos sinal suficiente.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        Segue artistas, organizadores e espaços em Descobrir. Também podes
        escolher cidades e categorias no teu perfil.
      </p>

      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        <Link
          href="/descobrir"
          className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
        >
          Descobrir rede
        </Link>

        <Link
          href="/perfil"
          className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
        >
          Editar preferências
        </Link>
      </div>
    </section>
  );
}

function LoginCard() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Para ti
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        Entra para personalizar.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        A página Para ti usa os perfis que segues, as tuas cidades e categorias
        preferidas para montar uma agenda à tua medida.
      </p>

      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        <Link
          href="/login"
          className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
        >
          Entrar
        </Link>

        <Link
          href="/registar"
          className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
        >
          Criar conta
        </Link>
      </div>
    </section>
  );
}

export default function ForYouPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [eventArtists, setEventArtists] = useState<EventArtistRow[]>([]);

  const preferredCities = profile?.preferred_cities || [];
  const preferredCategories = profile?.preferred_categories || [];

  const followedArtistIds = useMemo(() => {
    return follows
      .filter((follow) => follow.target_type === "artist")
      .map((follow) => follow.target_id);
  }, [follows]);

  const followedOrganizerIds = useMemo(() => {
    return follows
      .filter((follow) => follow.target_type === "organizer")
      .map((follow) => follow.target_id);
  }, [follows]);

  const followedVenueIds = useMemo(() => {
    return follows
      .filter((follow) => follow.target_type === "venue")
      .map((follow) => follow.target_id);
  }, [follows]);

  const followedArtistEventIds = useMemo(() => {
    const artistSet = new Set(followedArtistIds);

    return new Set(
      eventArtists
        .filter((row) => artistSet.has(row.artist_id))
        .map((row) => row.event_id)
    );
  }, [eventArtists, followedArtistIds]);

  const scoredEvents = useMemo<ScoredEvent[]>(() => {
    const scored = events.map((event) => {
      let score = 0;
      const reasons: string[] = [];

      if (event.featured) {
        score += 20;
        reasons.push("Destaque Paranoid");
      }

      if (event.city && preferredCities.includes(event.city)) {
        score += 45;
        reasons.push(`Cidade preferida: ${event.city}`);
      }

      if (event.category && preferredCategories.includes(event.category)) {
        score += 35;
        reasons.push(`Categoria preferida: ${event.category}`);
      }

      if (event.organizer_id && followedOrganizerIds.includes(event.organizer_id)) {
        score += 100;
        reasons.push("Organizador que segues");
      }

      if (event.venue_id && followedVenueIds.includes(event.venue_id)) {
        score += 90;
        reasons.push("Espaço que segues");
      }

      if (followedArtistEventIds.has(event.id)) {
        score += 100;
        reasons.push("Artista que segues");
      }

      if (score === 0) {
        score = 5;
        reasons.push("Sugestão da agenda");
      }

      return {
        ...event,
        score,
        reasons: uniqueReasons(reasons),
      };
    });

    return scored.sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return sortByDate(first, second);
    });
  }, [
    events,
    preferredCities,
    preferredCategories,
    followedOrganizerIds,
    followedVenueIds,
    followedArtistEventIds,
  ]);

  const topEvents = scoredEvents.slice(0, 12);

  const strongRecommendations = scoredEvents.filter((event) => event.score >= 50);
  const featuredEvents = events.filter((event) => event.featured);

  async function loadForYou() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id || "");

    let loadedProfile: ProfileRow | null = null;
    let loadedFollows: FollowRow[] = [];

    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id,email,display_name,account_type,account_status,preferred_cities,preferred_categories"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage(profileError.message);
      }

      loadedProfile = (profileData || null) as ProfileRow | null;

      const { data: followData, error: followError } = await supabase
        .from("follows")
        .select("id,user_id,target_type,target_id")
        .eq("user_id", user.id);

      if (followError) {
        setMessage(followError.message);
      }

      loadedFollows = (followData || []) as FollowRow[];
    }

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(
        "id,slug,title,status,city,venue_id,venue_name,organizer_id,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_price"
      )
      .eq("status", "published")
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(80);

    if (eventError) {
      setMessage(eventError.message);
    }

    const loadedEvents = (eventData || []) as EventRow[];

    const artistIds = loadedFollows
      .filter((follow) => follow.target_type === "artist")
      .map((follow) => follow.target_id);

    let loadedEventArtists: EventArtistRow[] = [];

    if (artistIds.length > 0) {
      const { data: eventArtistData, error: eventArtistError } = await supabase
        .from("event_artists")
        .select("event_id,artist_id")
        .in("artist_id", artistIds);

      if (eventArtistError) {
        setMessage(eventArtistError.message);
      }

      loadedEventArtists = (eventArtistData || []) as EventArtistRow[];
    }

    setProfile(loadedProfile);
    setFollows(loadedFollows);
    setEvents(loadedEvents);
    setEventArtists(loadedEventArtists);

    setLoading(false);
  }

  useEffect(() => {
    loadForYou();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">A preparar recomendações...</p>
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
              Para ti
            </p>

            <h1 className="text-6xl font-black leading-none tracking-tight lg:text-9xl">
              O teu radar.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Eventos puxados pelos teus follows, cidades, categorias e
              destaques da agenda.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{strongRecommendations.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Relevantes
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{featuredEvents.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Destaques
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

        <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[340px_1fr] lg:items-start">
          <aside className="space-y-6 lg:sticky lg:top-28">
            {!userId && <LoginCard />}

            <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Sinais usados
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none">
                Como isto pensa.
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                  <p className="text-3xl font-black">{follows.length}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Perfis seguidos
                  </p>
                </div>

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
                    Categorias
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <Link
                  href="/descobrir"
                  className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
                >
                  Seguir mais perfis
                </Link>

                <Link
                  href="/perfil"
                  className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                >
                  Editar preferências
                </Link>

                <button
                  type="button"
                  onClick={loadForYou}
                  className="rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500"
                >
                  Atualizar
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Preferências
              </p>

              <div className="mt-5">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-600">
                  Cidades
                </p>

                {preferredCities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {preferredCities.map((city) => (
                      <span
                        key={city}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-300"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Ainda não escolheste cidades.
                  </p>
                )}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-600">
                  Categorias
                </p>

                {preferredCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {preferredCategories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-300"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Ainda não escolheste categorias.
                  </p>
                )}
              </div>
            </section>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Recomendações
              </p>

              <h2 className="mt-3 text-5xl font-black leading-none lg:text-7xl">
                Apanhado pelo radar.
              </h2>
            </div>

            {topEvents.length === 0 && <EmptyState />}

            {topEvents.map((event) => {
              const ticket = ticketLabel(event.ticket_mode);

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
                        <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-black uppercase text-red-300">
                          {event.score >= 50 ? "Para ti" : "Sugestão"}
                        </span>

                        {event.featured && (
                          <span className="rounded-full border border-yellow-900 bg-yellow-950/20 px-3 py-1 text-xs font-black uppercase text-yellow-500">
                            Destaque
                          </span>
                        )}

                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black uppercase text-zinc-300">
                          {event.category || "Evento"}
                        </span>

                        {ticket && (
                          <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-black uppercase text-green-400">
                            {ticket}
                          </span>
                        )}
                      </div>

                      <Link href={`/eventos/${event.slug}`}>
                        <h3 className="mt-4 text-4xl font-black leading-none lg:text-6xl">
                          {event.title}
                        </h3>
                      </Link>

                      {event.reasons.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {event.reasons.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold text-zinc-400"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

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
                            Cidade
                          </span>
                          {event.city || "Sem cidade"}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/eventos/${event.slug}`}
                          className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
                        >
                          Ver evento
                        </Link>

                        <Link
                          href="/agenda"
                          className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                        >
                          Agenda completa
                        </Link>
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