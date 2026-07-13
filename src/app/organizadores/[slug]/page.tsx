"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
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
            Organizador
          </p>

          <h1 className="mt-4 text-5xl font-black leading-none lg:text-7xl">
            Não encontramos este organizador.
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
        Este organizador ainda não tem eventos publicados na agenda.
      </p>
    </section>
  );
}

export default function OrganizerPage() {
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

  const [organizer, setOrganizer] = useState<OrganizerRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState("");
  const [hasFrequency, setHasFrequency] = useState(false);

  async function loadOrganizer() {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: organizerData, error: organizerError } = await supabase
      .from("organizers")
      .select("id,slug,name,city,description,pack,verified")
      .eq("slug", slug)
      .maybeSingle();

    if (organizerError) {
      setMessage(organizerError.message);
      setOrganizer(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedOrganizer = (organizerData || null) as OrganizerRow | null;
    setOrganizer(loadedOrganizer);
    setHasFrequency(false);

    if (!loadedOrganizer) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const frequencyResponse = await fetch(
      `/api/billing/frequency/status?organizerId=${loadedOrganizer.id}`
    ).catch(() => null);

    if (frequencyResponse?.ok) {
      const frequencyPayload = await frequencyResponse.json().catch(() => null);
      setHasFrequency(Boolean(frequencyPayload?.active));
    }

    const baseSelect =
      "id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,image_url,featured,ticket_mode,ticket_price";

    const [{ data: eventsById }, { data: eventsByName }] = await Promise.all([
      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("organizer_id", loadedOrganizer.id)
        .order("start_at", { ascending: true, nullsFirst: false }),

      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("organizer_name", loadedOrganizer.name)
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
        .eq("target_type", "organizer")
        .eq("target_id", loadedOrganizer.id)
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
    loadOrganizer();
  }, [slug]);

  async function toggleFollow() {
    setMessage("");
    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setActionLoading(false);
      setMessage("Tens de iniciar sessão para seguir organizadores.");
      return;
    }

    if (!organizer) {
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
        target_type: "organizer",
        target_id: organizer.id,
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
            <p className="text-zinc-500">A carregar organizador...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!organizer) {
    return <NotFoundCard />;
  }

  const featuredEvents = events.filter((event) => event.featured);

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
                Organizador
              </span>

              {organizer.verified && (
                <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-400">
                  Verificado
                </span>
              )}

              {organizer.pack && (
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-zinc-400">
                  {organizer.pack}
                </span>
              )}

              {hasFrequency && (
                <span className="rounded-full border border-red-800 bg-red-950 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-200">
                  Organizador Frequency
                </span>
              )}
            </div>

            <h1 className="mt-5 break-words text-6xl font-black leading-none tracking-tight lg:text-9xl">
              {organizer.name}
            </h1>

            <p className="mt-5 text-lg font-bold text-zinc-400">
              {organizer.city || "Sem cidade definida"}
            </p>
          </div>

          <aside className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Ação
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none">
              Segue a pista.
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
                    : "Seguir organizador"}
              </button>

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

              {organizer.description ? (
                <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-zinc-300">
                  {organizer.description}
                </p>
              ) : (
                <p className="mt-5 text-base leading-relaxed text-zinc-500">
                  Este organizador ainda não tem descrição pública.
                </p>
              )}
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

          <section className="space-y-5">
            <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Eventos
              </p>

              <h2 className="mt-3 text-5xl font-black leading-none lg:text-7xl">
                Próximas datas.
              </h2>
            </div>

            {events.length === 0 && <EmptyEvents />}

            {events.map((event) => {
              const ticket = ticketLabel(event.ticket_mode);

              return (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950"
                >
                  <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
                    <Link
                      href={`/eventos/${event.slug}`}
                      className="block min-h-56 bg-zinc-900 bg-cover bg-center lg:min-h-full"
                      style={{
                        backgroundImage: event.image_url
                          ? `url(${event.image_url})`
                          : "radial-gradient(circle at top, #3f0d0d, #111)",
                      }}
                      aria-label={event.title}
                    />

                    <div className="p-5 lg:p-6">
                      <div className="flex flex-wrap gap-2">
                        {event.featured && (
                          <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-black uppercase text-red-300">
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
                        <h3 className="mt-4 text-4xl font-black leading-none lg:text-5xl">
                          {event.title}
                        </h3>
                      </Link>

                      <div className="mt-4 grid gap-2 text-sm text-zinc-500 lg:grid-cols-2">
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
                            Preço
                          </span>
                          {event.price ||
                            event.ticket_price ||
                            "Preço por definir"}
                        </p>
                      </div>

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
