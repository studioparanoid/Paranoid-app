"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";
import { type EventSubmission } from "@/lib/submissions";
import { AdminSubmissionActions } from "@/components/AdminSubmissionActions";
import { AdminEventActions } from "@/components/AdminEventActions";

type AdminStats = {
  pendingSubmissions: number;
  publishedEvents: number;
  archivedEvents: number;
  featuredEvents: number;
  totalArtists: number;
  totalVenues: number;
  totalOrganizers: number;
};

type AdminDashboardClientProps = {
  initialEvents?: AppEvent[];
  initialSubmissions?: EventSubmission[];
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  category: string;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  status: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return value;
}

function mapEvent(event: EventRow): AppEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    city: event.city,
    venue: event.venue_name || "Espaço por definir",
    organizer: event.organizer_name || "Organizador por definir",
    date: event.display_date || "Data por definir",
    time: event.display_time || "Hora por definir",
    category: event.category,
    price: event.price || "Preço por definir",
    description: event.description || "",
    image: event.image_url,
    featured: Boolean(event.featured),
  };
}

function hasStatus(event: EventRow, status: string) {
  return (
    String(event.status || "")
      .trim()
      .toLowerCase() === status
  );
}

export function AdminDashboardClient({
  initialEvents = [],
  initialSubmissions = [],
}: AdminDashboardClientProps) {
  const [events, setEvents] = useState<AppEvent[]>(initialEvents);
  const [archivedEvents, setArchivedEvents] = useState<AppEvent[]>([]);
  const [submissions, setSubmissions] =
    useState<EventSubmission[]>(initialSubmissions);

  const [stats, setStats] = useState<AdminStats>({
    pendingSubmissions: initialSubmissions.length,
    publishedEvents: initialEvents.length,
    archivedEvents: 0,
    featuredEvents: initialEvents.filter((event) => event.featured).length,
    totalArtists: 0,
    totalVenues: 0,
    totalOrganizers: 0,
  });

  const [loading, setLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setDebugMessage("");

    const [
      submissionsResult,
      eventsResult,
      artistsResult,
      venuesResult,
      organizersResult,
    ] = await Promise.all([
      supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select(
          "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
        )
        .in("status", ["published", "archived"])
        .order("start_at", { ascending: true }),
      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase.from("venues").select("id", { count: "exact", head: true }),
      supabase.from("organizers").select("id", { count: "exact", head: true }),
    ]);

    if (submissionsResult.error) {
      setDebugMessage(`Erro submissões: ${submissionsResult.error.message}`);
    }

    if (eventsResult.error) {
      setDebugMessage(`Erro eventos: ${eventsResult.error.message}`);
    }

    const loadedSubmissions = !submissionsResult.error
      ? ((submissionsResult.data || []) as EventSubmission[])
      : [];

    const eventRows = !eventsResult.error
      ? ((eventsResult.data || []) as EventRow[])
      : [];

    const publishedRows = eventRows.filter((event) =>
      hasStatus(event, "published")
    );

    const archivedRows = eventRows.filter((event) =>
      hasStatus(event, "archived")
    );

    const mappedEvents = publishedRows.map(mapEvent);
    const mappedArchivedEvents = archivedRows.map(mapEvent);

    setSubmissions(loadedSubmissions);
    setEvents(mappedEvents);
    setArchivedEvents(mappedArchivedEvents);

    setStats({
      pendingSubmissions: loadedSubmissions.length,
      publishedEvents: mappedEvents.length,
      archivedEvents: mappedArchivedEvents.length,
      featuredEvents: mappedEvents.filter((event) => event.featured).length,
      totalArtists: artistsResult.count || 0,
      totalVenues: venuesResult.count || 0,
      totalOrganizers: organizersResult.count || 0,
    });

    setLoading(false);
  }

  function removePublishedEvent(eventId: string) {
    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId)
    );
  }

  function removeArchivedEvent(eventId: string) {
    setArchivedEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId)
    );
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="mt-8 space-y-8">
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/eventos/novo"
          className="rounded-[2rem] border border-red-950 bg-red-950/40 p-5"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-red-500">
            Novo
          </p>

          <h2 className="mt-3 text-2xl font-black leading-none text-[#f2f1ec]">
            Criar evento
          </h2>

          <p className="mt-3 text-sm text-zinc-500">
            Publica direto sem submissão.
          </p>
        </Link>

        <Link
          href="/admin/rede"
          className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-red-700">
            Rede
          </p>

          <h2 className="mt-3 text-2xl font-black leading-none text-[#f2f1ec]">
            Gerir rede
          </h2>

          <p className="mt-3 text-sm text-zinc-500">
            Artistas, espaços e organizadores.
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-4 gap-3">
        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {stats.pendingSubmissions}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Pend.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {stats.publishedEvents}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Ativos
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {stats.archivedEvents}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Arq.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {stats.featuredEvents}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Dest.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
          <p className="text-2xl font-black text-[#f2f1ec]">
            {stats.totalArtists}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Artistas
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
          <p className="text-2xl font-black text-[#f2f1ec]">
            {stats.totalVenues}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Espaços
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
          <p className="text-2xl font-black text-[#f2f1ec]">
            {stats.totalOrganizers}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Orgs.
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={loadDashboard}
        disabled={loading}
        className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300 disabled:opacity-50"
      >
        {loading ? "A atualizar..." : "Atualizar painel"}
      </button>

      {debugMessage && (
        <div className="rounded-[2rem] border border-red-950 bg-red-950/20 p-4">
          <p className="text-sm font-bold text-red-400">{debugMessage}</p>
        </div>
      )}

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Submissões
            </p>

            <h2 className="mt-2 text-3xl font-black">Por aprovar</h2>
          </div>

          <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
            {submissions.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {submissions.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">Não há submissões pendentes.</p>
            </div>
          )}

          {submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
            >
              {submission.image_url && (
                <div
                  className="mb-4 h-48 rounded-[1.5rem] bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${submission.image_url})`,
                  }}
                />
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    {submission.category}
                  </p>

                  <h3 className="mt-2 text-2xl font-black leading-tight">
                    {submission.title}
                  </h3>
                </div>

                <span className="rounded-full border border-yellow-900 bg-yellow-950/30 px-3 py-1 text-xs font-black uppercase text-yellow-500">
                  {submission.status}
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-zinc-400">
                <p>
                  <span className="font-bold text-zinc-300">Cidade:</span>{" "}
                  {submission.city}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Espaço:</span>{" "}
                  {submission.venue || "Por definir"}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Organizador:</span>{" "}
                  {submission.organizer || "Por definir"}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Data:</span>{" "}
                  {formatDate(submission.event_date)}{" "}
                  {submission.event_time ? `· ${submission.event_time}` : ""}
                </p>

                {submission.price && (
                  <p>
                    <span className="font-bold text-zinc-300">Preço:</span>{" "}
                    {submission.price}
                  </p>
                )}
              </div>

              {submission.description && (
                <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
                  {submission.description}
                </p>
              )}

              <AdminSubmissionActions
                submission={submission}
                onDone={loadDashboard}
              />
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Publicados
            </p>

            <h2 className="mt-2 text-3xl font-black">Eventos ativos</h2>
          </div>

          <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
            {events.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {events.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">Ainda não há eventos publicados.</p>
            </div>
          )}

          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
            >
              {event.image && (
                <div
                  className="mb-4 h-48 rounded-[1.5rem] bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${event.image})`,
                  }}
                />
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    {event.category}
                  </p>

                  <h3 className="mt-2 text-2xl font-black leading-tight">
                    {event.title}
                  </h3>

                  <p className="mt-2 text-xs text-zinc-600">/{event.slug}</p>
                </div>

                {event.featured && (
                  <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
                    Destaque
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-1 text-sm text-zinc-400">
                <p>
                  <span className="font-bold text-zinc-300">Cidade:</span>{" "}
                  {event.city}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Espaço:</span>{" "}
                  {event.venue}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Organizador:</span>{" "}
                  {event.organizer}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Data:</span>{" "}
                  {event.date} {event.time ? `· ${event.time}` : ""}
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

              <AdminEventActions
                event={event}
                mode="published"
                onDone={loadDashboard}
                onArchived={removePublishedEvent}
              />
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-700">
              Arquivo
            </p>

            <h2 className="mt-2 text-3xl font-black">Eventos arquivados</h2>
          </div>

          <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
            {archivedEvents.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {archivedEvents.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">Ainda não há eventos arquivados.</p>
            </div>
          )}

          {archivedEvents.map((event) => (
            <article
              key={event.id}
              className="rounded-[2rem] border border-yellow-950 bg-yellow-950/10 p-5"
            >
              {event.image && (
                <div
                  className="mb-4 h-48 rounded-[1.5rem] bg-cover bg-center opacity-60"
                  style={{
                    backgroundImage: `url(${event.image})`,
                  }}
                />
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
                    {event.category}
                  </p>

                  <h3 className="mt-2 text-2xl font-black leading-tight text-zinc-300">
                    {event.title}
                  </h3>

                  <p className="mt-2 text-xs text-zinc-600">/{event.slug}</p>
                </div>

                <span className="rounded-full border border-yellow-900 bg-yellow-950/30 px-3 py-1 text-xs font-black uppercase text-yellow-500">
                  Arquivado
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-zinc-500">
                <p>
                  <span className="font-bold text-zinc-400">Cidade:</span>{" "}
                  {event.city}
                </p>

                <p>
                  <span className="font-bold text-zinc-400">Espaço:</span>{" "}
                  {event.venue}
                </p>

                <p>
                  <span className="font-bold text-zinc-400">Data:</span>{" "}
                  {event.date} {event.time ? `· ${event.time}` : ""}
                </p>
              </div>

              <AdminEventActions
                event={event}
                mode="archived"
                onDone={loadDashboard}
                onRestored={removeArchivedEvent}
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}