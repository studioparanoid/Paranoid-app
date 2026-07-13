"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminEventActions } from "@/components/AdminEventActions";
import { AdminSubmissionActions } from "@/components/AdminSubmissionActions";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";
import { AdminListSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";

type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  category: string | null;
  price: string | null;
  image_url: string | null;
  featured: boolean | null;
  status: string | null;
  ticket_mode: string | null;
  ticket_price: string | null;
  ticket_capacity: number | null;
  created_at: string | null;
};

type ProfileClaimRow = {
  id: string;
  account_type: "artist" | "organizer" | "venue";
  entity_name: string;
  city: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Counts = {
  pendingSubmissions: number;
  publishedEvents: number;
  archivedEvents: number;
  artists: number;
  venues: number;
  organizers: number;
  pendingProfiles: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusLabel(value: string | null | undefined) {
  if (value === "archived") {
    return "Arquivado";
  }

  if (value === "draft") {
    return "Rascunho";
  }

  if (value === "rejected") {
    return "Rejeitado";
  }

  if (value === "approved") {
    return "Aprovado";
  }

  if (value === "pending") {
    return "Pendente";
  }

  return "Publicado";
}

function ticketLabel(value: string | null | undefined) {
  if (value === "internal") {
    return "Bilheteira Paranoid";
  }

  if (value === "external") {
    return "Bilheteira externa";
  }

  return "Sem bilhetes";
}

function claimTypeLabel(value: string) {
  if (value === "artist") {
    return "Artista";
  }

  if (value === "organizer") {
    return "Organizador";
  }

  if (value === "venue") {
    return "Espaço";
  }

  return value;
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [pendingSubmissions, setPendingSubmissions] = useState<EventSubmission[]>(
    []
  );
  const [publishedEvents, setPublishedEvents] = useState<AdminEventRow[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<AdminEventRow[]>([]);
  const [pendingProfileClaims, setPendingProfileClaims] = useState<
    ProfileClaimRow[]
  >([]);

  const [counts, setCounts] = useState<Counts>({
    pendingSubmissions: 0,
    publishedEvents: 0,
    archivedEvents: 0,
    artists: 0,
    venues: 0,
    organizers: 0,
    pendingProfiles: 0,
  });

  const featuredEvents = useMemo(() => {
    return publishedEvents.filter((event) => event.featured);
  }, [publishedEvents]);

  async function countRows(table: string, filters?: Record<string, string>) {
    let query = supabase.from(table).select("id", {
      count: "exact",
      head: true,
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count } = await query;
    return count || 0;
  }

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const [
      pendingSubmissionsResponse,
      publishedEventsResponse,
      archivedEventsResponse,
      pendingProfilesResponse,
      pendingSubmissionsCount,
      publishedEventsCount,
      archivedEventsCount,
      artistsCount,
      venuesCount,
      organizersCount,
      pendingProfilesCount,
    ] = await Promise.all([
      supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8),

      supabase
        .from("events")
        .select(
          "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,image_url,featured,status,ticket_mode,ticket_price,ticket_capacity,created_at"
        )
        .eq("status", "published")
        .order("start_at", { ascending: true })
        .limit(12),

      supabase
        .from("events")
        .select(
          "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,image_url,featured,status,ticket_mode,ticket_price,ticket_capacity,created_at"
        )
        .eq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(6),

      supabase
        .from("profile_claims")
        .select("id,account_type,entity_name,city,status,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(6),

      countRows("event_submissions", { status: "pending" }),
      countRows("events", { status: "published" }),
      countRows("events", { status: "archived" }),
      countRows("artists"),
      countRows("venues"),
      countRows("organizers"),
      countRows("profile_claims", { status: "pending" }),
    ]);

    if (pendingSubmissionsResponse.error) {
      setMessage(pendingSubmissionsResponse.error.message);
    }

    if (publishedEventsResponse.error) {
      setMessage(publishedEventsResponse.error.message);
    }

    if (archivedEventsResponse.error) {
      setMessage(archivedEventsResponse.error.message);
    }

    if (pendingProfilesResponse.error) {
      setMessage(pendingProfilesResponse.error.message);
    }

    setPendingSubmissions(
      (pendingSubmissionsResponse.data || []) as EventSubmission[]
    );
    setPublishedEvents((publishedEventsResponse.data || []) as AdminEventRow[]);
    setArchivedEvents((archivedEventsResponse.data || []) as AdminEventRow[]);
    setPendingProfileClaims(
      (pendingProfilesResponse.data || []) as ProfileClaimRow[]
    );

    setCounts({
      pendingSubmissions: pendingSubmissionsCount,
      publishedEvents: publishedEventsCount,
      archivedEvents: archivedEventsCount,
      artists: artistsCount,
      venues: venuesCount,
      organizers: organizersCount,
      pendingProfiles: pendingProfilesCount,
    });

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <AdminListSkeleton />
      </section>
    );
  }

  return (
    <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[340px_1fr] lg:items-start">
      <aside className="space-y-6 lg:sticky lg:top-28">
        <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Painel
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none">
            Controlo geral.
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-yellow-900 bg-yellow-950/20 p-4">
              <p className="text-3xl font-black">{counts.pendingSubmissions}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-yellow-500">
                Submissões
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-red-900 bg-red-950/20 p-4">
              <p className="text-3xl font-black">{counts.pendingProfiles}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-red-400">
                Perfis
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{counts.publishedEvents}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Eventos
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{counts.artists}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Artistas
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{counts.venues}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Espaços
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{counts.organizers}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Organizadores
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              href="/admin/perfis"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Aprovar perfis
            </Link>

            <Link
              href="/admin/eventos/novo"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Criar evento
            </Link>

            <Link
              href="/admin/bilhetes"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Admin bilhetes
            </Link>

            <Link
              href="/admin/rede"
              className="rounded-full border border-zinc-800 px-5 py-4 text-center text-sm font-bold text-zinc-500"
            >
              Rede cultural
            </Link>

            <Button variant="secondary" onClick={() => void loadDashboard()}>
              Atualizar
            </Button>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
              {message}
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Destaques
          </p>

          <p className="mt-4 text-5xl font-black">{featuredEvents.length}</p>

          <p className="mt-2 text-sm text-zinc-500">
            Eventos marcados como destaque.
          </p>
        </section>
      </aside>

      <section className="space-y-8">
        <section className="rounded-[2.5rem] border border-red-950 bg-red-950/10 p-5 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-500">
                Aprovações de perfis
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                Artistas, organizadores e espaços.
              </h2>
            </div>

            <Link
              href="/admin/perfis"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Ver pedidos
            </Link>
          </div>

          <div className="mt-6 grid gap-3">
            {pendingProfileClaims.length === 0 && (
              <EmptyCard text="Não há perfis pendentes para aprovar." />
            )}

            {pendingProfileClaims.map((claim) => (
              <article
                key={claim.id}
                className="rounded-[1.5rem] border border-red-950 bg-black p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                      {claimTypeLabel(claim.account_type)}
                    </p>

                    <h3 className="mt-2 text-2xl font-black">
                      {claim.entity_name}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {claim.city || "Sem cidade"} ·{" "}
                      {formatDate(claim.created_at)}
                    </p>
                  </div>

                  <Link
                    href="/admin/perfis"
                    className="rounded-full border border-zinc-700 px-5 py-3 text-center text-sm font-bold text-zinc-300"
                  >
                    Rever
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Submissões pendentes
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                Para aprovar.
              </h2>
            </div>

            <Link
              href="/submeter"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Submeter evento
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {pendingSubmissions.length === 0 && (
              <EmptyCard text="Não há submissões pendentes." />
            )}

            {pendingSubmissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-[2rem] border border-zinc-800 bg-black p-5"
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-yellow-900 bg-yellow-950/20 px-3 py-1 text-xs font-black uppercase text-yellow-500">
                        Pendente
                      </span>

                      <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-bold uppercase text-zinc-500">
                        {submission.category}
                      </span>

                      {submission.ticket_mode && submission.ticket_mode !== "none" && (
                        <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-bold uppercase text-red-300">
                          {ticketLabel(submission.ticket_mode)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-3xl font-black leading-none lg:text-4xl">
                      {submission.title}
                    </h3>

                    <div className="mt-4 grid gap-1 text-sm text-zinc-500">
                      <p>
                        {submission.city} · {submission.venue}
                      </p>

                      <p>
                        {formatDate(submission.event_date)} ·{" "}
                        {submission.event_time || "Hora por definir"}
                      </p>

                      <p>Organizador: {submission.organizer}</p>

                      {submission.artists_text && (
                        <p>Artistas: {submission.artists_text}</p>
                      )}

                      {submission.ticket_mode === "internal" && (
                        <p>
                          Bilheteira Paranoid ·{" "}
                          {submission.ticket_price || "Preço por definir"} ·{" "}
                          {submission.ticket_capacity || "lotação indefinida"}
                        </p>
                      )}
                    </div>

                    {submission.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                        {submission.description}
                      </p>
                    )}
                  </div>

                  <AdminSubmissionActions submission={submission} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Eventos publicados
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                No ar.
              </h2>
            </div>

            <Link
              href="/admin/eventos/novo"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Criar evento
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {publishedEvents.length === 0 && (
              <EmptyCard text="Ainda não há eventos publicados." />
            )}

            {publishedEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-[2rem] border border-zinc-800 bg-black p-5"
              >
                <div className="grid gap-5 lg:grid-cols-[110px_1fr_260px] lg:items-start">
                  <div
                    className="h-28 rounded-[1.5rem] bg-zinc-900 bg-cover bg-center"
                    style={{
                      backgroundImage: event.image_url
                        ? `url(${event.image_url})`
                        : undefined,
                    }}
                  />

                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-black uppercase text-green-400">
                        {statusLabel(event.status)}
                      </span>

                      {event.featured && (
                        <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-black uppercase text-red-300">
                          Destaque
                        </span>
                      )}

                      {event.ticket_mode && event.ticket_mode !== "none" && (
                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold uppercase text-zinc-400">
                          {ticketLabel(event.ticket_mode)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-3xl font-black leading-none">
                      {event.title}
                    </h3>

                    <div className="mt-3 space-y-1 text-sm text-zinc-500">
                      <p>
                        {event.city || "Sem cidade"} ·{" "}
                        {event.venue_name || "Sem espaço"}
                      </p>

                      <p>
                        {event.display_date || "Sem data"} ·{" "}
                        {event.display_time || "Hora por definir"}
                      </p>

                      <p>
                        {event.category || "Sem categoria"} ·{" "}
                        {event.price || "Preço por definir"}
                      </p>
                    </div>
                  </div>

                  <AdminEventActions
                    event={{
                      id: event.id,
                      slug: event.slug,
                      featured: event.featured,
                      status: event.status,
                    }}
                    mode="published"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Arquivo
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
            Fora da montra.
          </h2>

          <div className="mt-6 grid gap-4">
            {archivedEvents.length === 0 && (
              <EmptyCard text="Não há eventos arquivados." />
            )}

            {archivedEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-[2rem] border border-zinc-800 bg-black p-5 opacity-80"
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-start">
                  <div>
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black uppercase text-zinc-500">
                      Arquivado
                    </span>

                    <h3 className="mt-4 text-3xl font-black leading-none">
                      {event.title}
                    </h3>

                    <p className="mt-3 text-sm text-zinc-500">
                      {event.display_date || "Sem data"} ·{" "}
                      {event.city || "Sem cidade"}
                    </p>
                  </div>

                  <AdminEventActions
                    event={{
                      id: event.id,
                      slug: event.slug,
                      featured: event.featured,
                      status: event.status,
                    }}
                    mode="archived"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}
