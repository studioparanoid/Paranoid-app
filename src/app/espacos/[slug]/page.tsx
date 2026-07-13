"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { EventCard } from "@/components/EventCard";
import { supabase } from "@/lib/supabase/public";

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  instagram: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  city: string | null;
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
  image_url: string | null;
  featured: boolean | null;
  ticket_mode: string | null;
  ticket_price: string | null;
};

type FollowRow = {
  id: string;
};

function normalizeExternalUrl(value: string | null | undefined) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function eventDateValue(event: EventRow) {
  return event.start_at || event.start_date || event.display_date || "";
}

function mergeEvents(firstList: EventRow[], secondList: EventRow[]) {
  const map = new Map<string, EventRow>();

  firstList.forEach((event) => map.set(event.id, event));
  secondList.forEach((event) => map.set(event.id, event));

  return Array.from(map.values()).sort((first, second) => {
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
  });
}

function NotFoundCard() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-red-700">
            Espaço
          </p>

          <h1 className="mt-4 text-5xl font-black leading-none lg:text-7xl">
            Não encontramos este espaço.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-zinc-400">
            Pode ter sido removido ou ainda não estar aprovado na rede.
          </p>

          <Link
            href="/descobrir"
            className="mt-8 inline-block rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
          >
            Voltar à rede
          </Link>
        </div>
      </section>
    </main>
  );
}

function EmptyEvents() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Sem eventos
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        Ainda não há datas.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        Este espaço ainda não tem eventos publicados na agenda.
      </p>
    </section>
  );
}

export default function VenuePage() {
  const params = useParams();

  const slug = useMemo(() => {
    const rawSlug = params?.slug;

    if (Array.isArray(rawSlug)) {
      return rawSlug[0] || "";
    }

    return String(rawSlug || "");
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState("");

  async function loadVenue() {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: venueData, error: venueError } = await supabase
      .from("venues")
      .select("id,slug,name,city,address,description,instagram")
      .eq("slug", slug)
      .maybeSingle();

    if (venueError) {
      setMessage(venueError.message);
      setVenue(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedVenue = (venueData || null) as VenueRow | null;
    setVenue(loadedVenue);

    if (!loadedVenue) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const baseSelect =
      "id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,image_url,featured,ticket_mode,ticket_price";

    const [{ data: eventsById }, { data: eventsByName }] = await Promise.all([
      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("venue_id", loadedVenue.id)
        .order("start_at", { ascending: true, nullsFirst: false }),

      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("venue_name", loadedVenue.name)
        .order("start_at", { ascending: true, nullsFirst: false }),
    ]);

    setEvents(
      mergeEvents(
        (eventsById || []) as EventRow[],
        (eventsByName || []) as EventRow[]
      )
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("target_type", "venue")
        .eq("target_id", loadedVenue.id)
        .maybeSingle();

      const loadedFollow = (followData || null) as FollowRow | null;

      setIsFollowing(Boolean(loadedFollow));
      setFollowId(loadedFollow?.id || "");
    } else {
      setIsFollowing(false);
      setFollowId("");
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadVenue(); }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  async function toggleFollow() {
    setMessage("");
    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setActionLoading(false);
      setMessage("Tens de iniciar sessão para seguir espaços.");
      return;
    }

    if (!venue) {
      setActionLoading(false);
      return;
    }

    if (isFollowing && followId) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", followId);

      if (error) {
        setMessage(error.message);
        setActionLoading(false);
        return;
      }

      setIsFollowing(false);
      setFollowId("");
      setActionLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("follows")
      .insert({
        user_id: user.id,
        target_type: "venue",
        target_id: venue.id,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      setActionLoading(false);
      return;
    }

    setIsFollowing(true);
    setFollowId(data.id);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">A carregar espaço...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!venue) {
    return <NotFoundCard />;
  }

  const featuredEvents = events.filter((event) => event.featured);
  const instagramUrl = normalizeExternalUrl(venue.instagram);

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link
          href="/descobrir"
          className="mb-6 inline-block text-sm text-zinc-400"
        >
          ← Voltar à rede
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-300">
                Espaço
              </span>

              {venue.city && (
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-zinc-400">
                  {venue.city}
                </span>
              )}
            </div>

            <h1 className="mt-5 break-words text-6xl font-black leading-none tracking-tight lg:text-9xl">
              {venue.name}
            </h1>

            <p className="mt-5 text-lg font-bold text-zinc-400">
              {venue.address || venue.city || "Sem morada definida"}
            </p>
          </div>

          <aside className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Ação
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none">
              Entra no espaço.
            </h2>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={toggleFollow}
                disabled={actionLoading}
                className={`rounded-full px-5 py-4 text-sm font-black disabled:opacity-50 ${
                  isFollowing
                    ? "border border-zinc-700 text-zinc-300"
                    : "bg-[#f2f1ec] text-black"
                }`}
              >
                {actionLoading
                  ? "A guardar..."
                  : isFollowing
                    ? "A seguir"
                    : "Seguir espaço"}
              </button>

              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                >
                  Instagram
                </a>
              )}

              <Link
                href="/submeter"
                className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
              >
                Submeter evento
              </Link>

              <Link
                href="/agenda"
                className="rounded-full border border-zinc-800 px-5 py-4 text-center text-sm font-bold text-zinc-500"
              >
                Ver agenda
              </Link>
            </div>

            {message && (
              <p className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                {message}
              </p>
            )}
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[380px_1fr] lg:items-start">
          <aside className="space-y-6 lg:sticky lg:top-28">
            <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Sobre
              </p>

              {venue.description ? (
                <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-zinc-300">
                  {venue.description}
                </p>
              ) : (
                <p className="mt-5 text-base leading-relaxed text-zinc-500">
                  Este espaço ainda não tem descrição pública.
                </p>
              )}

              <div className="mt-6 space-y-4 text-sm text-zinc-400">
                <p>
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-600">
                    Cidade
                  </span>
                  {venue.city || "Sem cidade"}
                </p>

                <p>
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-600">
                    Morada
                  </span>
                  {venue.address || "Sem morada"}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-5xl font-black">{events.length}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Eventos
                </p>
              </article>

              <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-5xl font-black">{featuredEvents.length}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Destaques
                </p>
              </article>
            </section>
          </aside>

          <section>
            <div className="mb-6 border-b border-zinc-800 pb-5">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Eventos
              </p>

              <h2 className="mt-2 text-3xl font-black leading-none lg:text-4xl">
                O que acontece aqui
              </h2>
            </div>

            {events.length === 0 && <EmptyEvents />}

            {events.length > 0 && (
              <CardGrid>
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={{
                      id: event.id,
                      slug: event.slug,
                      title: event.title,
                      date: event.display_date || event.start_at || event.start_date || "Data por definir",
                      time: event.display_time,
                      venue: event.venue_name,
                      city: event.city,
                      price: event.price || event.ticket_price,
                      category: event.category,
                      image: event.image_url,
                      featured: Boolean(event.featured),
                    }}
                    showSave
                  />
                ))}
              </CardGrid>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
