"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type SavedEventRow = {
  event_id: string;
  created_at: string | null;
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
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  ticket_mode: string | null;
  ticket_price: string | null;
};

type SavedEvent = EventRow & {
  saved_at: string | null;
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

function sortSavedEvents(events: SavedEvent[]) {
  return [...events].sort((first, second) => {
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

function LoginCard() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Guardados
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        Entra para guardar eventos.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        Guarda concertos, festas, sessões e datas que queres apanhar mais tarde.
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

function EmptyState() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Sem guardados
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        Ainda não guardaste nada.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        Vai à agenda, abre um evento e guarda o que queres acompanhar.
      </p>

      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        <Link
          href="/agenda"
          className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
        >
          Ver agenda
        </Link>

        <Link
          href="/para-ti"
          className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
        >
          Para ti
        </Link>
      </div>
    </section>
  );
}

export default function SavedEventsPage() {
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [savedRows, setSavedRows] = useState<SavedEventRow[]>([]);
  const [events, setEvents] = useState<SavedEvent[]>([]);

  const sortedEvents = useMemo(() => sortSavedEvents(events), [events]);

  async function loadSavedEvents() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId("");
      setSavedRows([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: savedData, error: savedError } = await supabase
      .from("saved_events")
      .select("event_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedError) {
      setMessage(savedError.message);
      setSavedRows([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedSavedRows = (savedData || []) as SavedEventRow[];
    setSavedRows(loadedSavedRows);

    const eventIds = loadedSavedRows
      .map((row) => row.event_id)
      .filter(Boolean);

    if (eventIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(
        "id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_price"
      )
      .eq("status", "published")
      .in("id", eventIds);

    if (eventError) {
      setMessage(eventError.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    const savedMap = new Map<string, string | null>();

    loadedSavedRows.forEach((row) => {
      savedMap.set(row.event_id, row.created_at);
    });

    const loadedEvents = ((eventData || []) as EventRow[]).map((event) => ({
      ...event,
      saved_at: savedMap.get(event.id) || null,
    }));

    setEvents(loadedEvents);
    setLoading(false);
  }

  useEffect(() => {
    loadSavedEvents();
  }, []);

  async function removeSavedEvent(eventId: string) {
    if (!userId) {
      setMessage("Tens de iniciar sessão para remover guardados.");
      return;
    }

    setRemovingId(eventId);
    setMessage("");

    const { error } = await supabase
      .from("saved_events")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", eventId);

    if (error) {
      setMessage(error.message);
      setRemovingId("");
      return;
    }

    setSavedRows((current) =>
      current.filter((row) => row.event_id !== eventId)
    );

    setEvents((current) => current.filter((event) => event.id !== eventId));
    setRemovingId("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">A carregar guardados...</p>
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
              Guardados
            </p>

            <h1 className="text-6xl font-black leading-none tracking-tight lg:text-9xl">
              A tua pilha.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 lg:text-lg">
              Eventos que marcaste para não perder no meio do ruído.
            </p>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Estado
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{savedRows.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Guardados
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{events.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Ativos
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href="/agenda"
                className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
              >
                Encontrar eventos
              </Link>

              <button
                type="button"
                onClick={loadSavedEvents}
                className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
              >
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-8 rounded-[2rem] border border-red-900 bg-red-950/20 p-5">
            <p className="text-sm font-bold text-red-300">{message}</p>
          </div>
        )}

        <section className="mt-8 lg:mt-12">
          {!userId && <LoginCard />}

          {userId && sortedEvents.length === 0 && <EmptyState />}

          {userId && sortedEvents.length > 0 && (
            <section className="space-y-5">
              {sortedEvents.map((event) => {
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
                            Guardado
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
                          <h2 className="mt-4 text-4xl font-black leading-none lg:text-6xl">
                            {event.title}
                          </h2>
                        </Link>

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

                          <button
                            type="button"
                            onClick={() => removeSavedEvent(event.id)}
                            disabled={removingId === event.id}
                            className="rounded-full border border-red-900 px-5 py-4 text-sm font-bold text-red-300 disabled:opacity-50"
                          >
                            {removingId === event.id
                              ? "A remover..."
                              : "Remover"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </section>
      </section>
    </main>
  );
}