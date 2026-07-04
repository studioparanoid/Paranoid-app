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
  featuredEvents: number;
  totalArtists: number;
  totalVenues: number;
  totalOrganizers: number;
};

type AdminDashboardClientProps = {
  initialEvents?: AppEvent[];
  initialSubmissions?: EventSubmission[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return value;
}

export function AdminDashboardClient({
  initialEvents = [],
  initialSubmissions = [],
}: AdminDashboardClientProps) {
  const [events, setEvents] = useState<AppEvent[]>(initialEvents);
  const [submissions, setSubmissions] =
    useState<EventSubmission[]>(initialSubmissions);

  const [stats, setStats] = useState<AdminStats>({
    pendingSubmissions: initialSubmissions.length,
    publishedEvents: initialEvents.length,
    featuredEvents: initialEvents.filter((event) => event.featured).length,
    totalArtists: 0,
    totalVenues: 0,
    totalOrganizers: 0,
  });

  const [loading, setLoading] = useState(false);

  async function loadDashboard() {
    setLoading(true);

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
        .select("*")
        .eq("status", "published")
        .order("start_at", { ascending: true }),
      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase.from("venues").select("id", { count: "exact", head: true }),
      supabase.from("organizers").select("id", { count: "exact", head: true }),
    ]);

    if (!submissionsResult.error) {
      setSubmissions((submissionsResult.data || []) as EventSubmission[]);
    }

    if (!eventsResult.error) {
      const mappedEvents = (eventsResult.data || []).map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        city: event.city,
        venue: event.venue_name || event.venue || "Espaço por definir",
        organizer:
          event.organizer_name || event.organizer || "Organizador por definir",
        date: event.display_date,
        time: event.display_time,
        category: event.category,
        price: event.price,
        description: event.description,
        image: event.image_url,
        featured: event.featured,
      })) as AppEvent[];

      setEvents(mappedEvents);

      setStats((currentStats) => ({
        ...currentStats,
        pendingSubmissions: submissionsResult.data?.length || 0,
        publishedEvents: mappedEvents.length,
        featuredEvents: mappedEvents.filter((event) => event.featured).length,
        totalArtists: artistsResult.count || 0,
        totalVenues: venuesResult.count || 0,
        totalOrganizers: organizersResult.count || 0,
      }));
    } else {
      setStats((currentStats) => ({
        ...currentStats,
        pendingSubmissions: submissionsResult.data?.length || 0,
        totalArtists: artistsResult.count || 0,
        totalVenues: venuesResult.count || 0,
        totalOrganizers: organizersResult.count || 0,
      }));
    }

    setLoading(false);
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

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {stats.pendingSubmissions}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Pendentes
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {stats.publishedEvents}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Eventos
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {stats.featuredEvents}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Destaques
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

              <AdminEventActions event={event} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}