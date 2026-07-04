"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";
import { AdminSubmissionActions } from "@/components/AdminSubmissionActions";
import { AdminEventActions } from "@/components/AdminEventActions";

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
  start_at: string | null;
};

type NetworkCounts = {
  artists: number;
  venues: number;
  organizers: number;
};

function formatDate(value: string | null) {
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

function SubmissionCard({ submission }: { submission: EventSubmission }) {
  return (
    <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
      {submission.image_url && (
        <div
          className="mb-4 h-52 rounded-[1.5rem] bg-cover bg-center"
          style={{ backgroundImage: `url(${submission.image_url})` }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            {submission.category || "Submissão"}
          </p>

          <h3 className="mt-2 text-2xl font-black leading-tight">
            {submission.title}
          </h3>
        </div>

        <span className="shrink-0 rounded-full border border-yellow-900 bg-yellow-950/30 px-3 py-1 text-xs font-black uppercase text-yellow-500">
          {submission.status}
        </span>
      </div>

      <div className="mt-4 space-y-1 text-sm text-zinc-400">
        <p>
          <span className="font-bold text-zinc-300">Data:</span>{" "}
          {submission.event_date || "Sem data"}
          {submission.is_multi_day && submission.end_date
            ? ` → ${submission.end_date}`
            : ""}
          {submission.event_time ? ` · ${submission.event_time}` : ""}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Cidade:</span>{" "}
          {submission.city || "Cidade por definir"}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Espaço:</span>{" "}
          {submission.venue || "Espaço por definir"}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Organizador:</span>{" "}
          {submission.organizer || "Organizador por definir"}
        </p>

        {submission.artists_text && (
          <p>
            <span className="font-bold text-zinc-300">Artistas:</span>{" "}
            {submission.artists_text}
          </p>
        )}
      </div>

      {submission.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {submission.description}
        </p>
      )}

      <div className="mt-5 grid gap-2">
        <Link
          href={`/admin/submissoes/${submission.id}`}
          className="rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
        >
          Editar submissão
        </Link>

        <AdminSubmissionActions submission={submission} />
      </div>
    </article>
  );
}

function EventCard({
  event,
  mode,
}: {
  event: EventRow;
  mode: "published" | "archived";
}) {
  return (
    <article className="h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
      {event.image_url && (
        <Link
          href={`/eventos/${event.slug}`}
          className="mb-4 block h-52 rounded-[1.5rem] bg-cover bg-center"
          style={{ backgroundImage: `url(${event.image_url})` }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            {event.category || "Evento"}
          </p>

          <h3 className="mt-2 text-2xl font-black leading-tight">
            {event.title}
          </h3>
        </div>

        {event.featured && (
          <span className="shrink-0 rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
            Destaque
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1 text-sm text-zinc-400">
        <p>
          <span className="font-bold text-zinc-300">Data:</span>{" "}
          {event.display_date || formatDate(event.start_at)}
          {event.display_time ? ` · ${event.display_time}` : ""}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Cidade:</span>{" "}
          {event.city || "Cidade por definir"}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Espaço:</span>{" "}
          {event.venue_name || "Espaço por definir"}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Organizador:</span>{" "}
          {event.organizer_name || "Organizador por definir"}
        </p>
      </div>

      {event.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {event.description}
        </p>
      )}

      <div className="mt-5">
        <AdminEventActions
          eventId={event.id}
          slug={event.slug}
          featured={Boolean(event.featured)}
          mode={mode}
        />
      </div>
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

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [debugMessage, setDebugMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");

  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [publishedEvents, setPublishedEvents] = useState<EventRow[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<EventRow[]>([]);
  const [networkCounts, setNetworkCounts] = useState<NetworkCounts>({
    artists: 0,
    venues: 0,
    organizers: 0,
  });

  const featuredCount = useMemo(() => {
    return publishedEvents.filter((event) => event.featured).length;
  }, [publishedEvents]);

  async function checkAdmin(userId: string) {
    const { data: adminData } = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminData) {
      return true;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    return profileData?.role === "admin";
  }

  async function loadDashboard() {
    setLoading(true);
    setDebugMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEmail("");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setEmail(user.email || "");

    const adminStatus = await checkAdmin(user.id);

    setIsAdmin(adminStatus);

    if (!adminStatus) {
      setLoading(false);
      return;
    }

    const [
      submissionsResult,
      publishedEventsResult,
      archivedEventsResult,
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
        .eq("status", "published")
        .order("start_at", { ascending: true }),

      supabase
        .from("events")
        .select(
          "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
        )
        .eq("status", "archived")
        .order("start_at", { ascending: false }),

      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase.from("venues").select("id", { count: "exact", head: true }),
      supabase.from("organizers").select("id", { count: "exact", head: true }),
    ]);

    const errors = [
      submissionsResult.error?.message,
      publishedEventsResult.error?.message,
      archivedEventsResult.error?.message,
      artistsResult.error?.message,
      venuesResult.error?.message,
      organizersResult.error?.message,
    ].filter(Boolean);

    if (errors.length > 0) {
      setDebugMessage(errors.join(" | "));
    }

    setSubmissions(
      !submissionsResult.error
        ? ((submissionsResult.data || []) as EventSubmission[])
        : []
    );

    setPublishedEvents(
      !publishedEventsResult.error
        ? ((publishedEventsResult.data || []) as EventRow[])
        : []
    );

    setArchivedEvents(
      !archivedEventsResult.error
        ? ((archivedEventsResult.data || []) as EventRow[])
        : []
    );

    setNetworkCounts({
      artists: artistsResult.count || 0,
      venues: venuesResult.count || 0,
      organizers: organizersResult.count || 0,
    });

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar painel admin...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-red-700">
          Sem sessão
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
          Tens de entrar.
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-zinc-400 lg:text-base">
          O painel admin só está disponível para contas autorizadas.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-red-700">
          Bloqueado
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
          Não tens acesso admin.
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-zinc-400 lg:text-base">
          Conta atual: {email}
        </p>

        <Link
          href="/perfil"
          className="mt-6 inline-block rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
        >
          Voltar ao perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Painel
          </p>

          <h2 className="mt-3 break-words text-2xl font-black leading-tight">
            {email}
          </h2>

          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-zinc-600">
            Admin Paranoid
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{submissions.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Pend.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{publishedEvents.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Pub.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{archivedEvents.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Arq.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{featuredCount}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Dest.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Rede
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-black">{networkCounts.artists}</p>
                <p className="text-[10px] font-bold uppercase text-zinc-600">
                  Art.
                </p>
              </div>

              <div>
                <p className="text-2xl font-black">{networkCounts.venues}</p>
                <p className="text-[10px] font-bold uppercase text-zinc-600">
                  Esp.
                </p>
              </div>

              <div>
                <p className="text-2xl font-black">
                  {networkCounts.organizers}
                </p>
                <p className="text-[10px] font-bold uppercase text-zinc-600">
                  Orgs.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              href="/admin/eventos/novo"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Criar evento
            </Link>

            <Link
              href="/admin/rede"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Gerir rede
            </Link>

            <Link
              href="/agenda"
              className="rounded-full border border-zinc-800 px-5 py-4 text-center text-sm font-bold text-zinc-500"
            >
              Ver agenda
            </Link>

            <button
              type="button"
              onClick={loadDashboard}
              className="rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500"
            >
              Atualizar painel
            </button>
          </div>

          {debugMessage && (
            <p className="mt-5 rounded-2xl border border-red-950 bg-red-950/20 p-4 text-xs leading-relaxed text-red-300">
              {debugMessage}
            </p>
          )}
        </aside>

        <section className="space-y-10">
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Submissões
                </p>

                <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                  À espera de aprovação
                </h2>
              </div>

              <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                {submissions.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {submissions.length === 0 && (
                <EmptyCard text="Não há submissões pendentes." />
              )}

              {submissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Publicados
                </p>

                <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                  Eventos ativos
                </h2>
              </div>

              <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                {publishedEvents.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {publishedEvents.length === 0 && (
                <EmptyCard text="Não há eventos publicados." />
              )}

              {publishedEvents.map((event) => (
                <EventCard key={event.id} event={event} mode="published" />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Arquivo
                </p>

                <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                  Eventos arquivados
                </h2>
              </div>

              <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                {archivedEvents.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {archivedEvents.length === 0 && (
                <EmptyCard text="Não há eventos arquivados." />
              )}

              {archivedEvents.map((event) => (
                <EventCard key={event.id} event={event} mode="archived" />
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}