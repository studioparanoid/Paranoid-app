"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
};

type OrganizerMemberRow = {
  organizer_id: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  organizer_name: string | null;
  organizer_id: string | null;
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

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-zinc-500">{text}</p>
    </div>
  );
}

function SubmissionCard({ submission }: { submission: EventSubmission }) {
  return (
    <article className="h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
      {submission.image_url && (
        <Link
          href={`/organizador/submissoes/${submission.id}`}
          className="mb-4 block h-52 rounded-[1.5rem] bg-cover bg-center"
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

      <Link
        href={`/organizador/submissoes/${submission.id}`}
        className="mt-5 block rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
      >
        Ver / editar submissão
      </Link>
    </article>
  );
}

function EventCard({
  event,
  archived = false,
}: {
  event: EventRow;
  archived?: boolean;
}) {
  return (
    <article className="h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
      {event.image_url && (
        <Link
          href={archived ? `/organizador/eventos/${event.id}` : `/eventos/${event.slug}`}
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
          <span className="font-bold text-zinc-300">Estado:</span>{" "}
          {event.status || "sem estado"}
        </p>
      </div>

      {event.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {event.description}
        </p>
      )}

      <div className="mt-5 grid gap-2">
        <Link
          href={`/organizador/eventos/${event.id}`}
          className="rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
        >
          Editar evento
        </Link>

        {!archived && (
          <Link
            href={`/eventos/${event.slug}`}
            className="rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
          >
            Ver público
          </Link>
        )}
      </div>
    </article>
  );
}

export function OrganizerDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState("");

  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [publishedEvents, setPublishedEvents] = useState<EventRow[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<EventRow[]>([]);

  const selectedOrganizer = useMemo(() => {
    return organizers.find((item) => item.id === selectedOrganizerId) || null;
  }, [organizers, selectedOrganizerId]);

  const pendingSubmissions = useMemo(() => {
    return submissions.filter((submission) => submission.status === "pending");
  }, [submissions]);

  const treatedSubmissions = useMemo(() => {
    return submissions.filter((submission) => submission.status !== "pending");
  }, [submissions]);

  const featuredCount = useMemo(() => {
    return publishedEvents.filter((event) => event.featured).length;
  }, [publishedEvents]);

  async function loadOrganizerData(organizerId: string) {
    if (!organizerId) {
      return;
    }

    setLoadingData(true);
    setMessage("");

    const [submissionsResult, publishedResult, archivedResult] =
      await Promise.all([
        supabase
          .from("event_submissions")
          .select("*")
          .eq("organizer_id", organizerId)
          .order("created_at", { ascending: false }),

        supabase
          .from("events")
          .select(
            "id,slug,title,city,venue_name,organizer_name,organizer_id,display_date,display_time,category,price,description,image_url,featured,status,start_at"
          )
          .eq("organizer_id", organizerId)
          .eq("status", "published")
          .order("start_at", { ascending: true }),

        supabase
          .from("events")
          .select(
            "id,slug,title,city,venue_name,organizer_name,organizer_id,display_date,display_time,category,price,description,image_url,featured,status,start_at"
          )
          .eq("organizer_id", organizerId)
          .eq("status", "archived")
          .order("start_at", { ascending: false }),
      ]);

    const errors = [
      submissionsResult.error?.message,
      publishedResult.error?.message,
      archivedResult.error?.message,
    ].filter(Boolean);

    if (errors.length > 0) {
      setMessage(errors.join(" | "));
    }

    setSubmissions(
      !submissionsResult.error
        ? ((submissionsResult.data || []) as EventSubmission[])
        : []
    );

    setPublishedEvents(
      !publishedResult.error ? ((publishedResult.data || []) as EventRow[]) : []
    );

    setArchivedEvents(
      !archivedResult.error ? ((archivedResult.data || []) as EventRow[]) : []
    );

    setLoadingData(false);
  }

  async function loadAccount() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEmail("");
      setOrganizers([]);
      setSelectedOrganizerId("");
      setLoading(false);
      return;
    }

    setEmail(user.email || "");

    const { data: membershipsData, error: membershipsError } = await supabase
      .from("organizer_members")
      .select("organizer_id")
      .eq("user_id", user.id);

    if (membershipsError) {
      setMessage(membershipsError.message);
      setLoading(false);
      return;
    }

    const organizerIds = ((membershipsData || []) as OrganizerMemberRow[])
      .map((membership) => membership.organizer_id)
      .filter(Boolean);

    if (organizerIds.length === 0) {
      setOrganizers([]);
      setSelectedOrganizerId("");
      setLoading(false);
      return;
    }

    const { data: organizersData, error: organizersError } = await supabase
      .from("organizers")
      .select("id,slug,name,city,description,pack,verified")
      .in("id", organizerIds)
      .order("name", { ascending: true });

    if (organizersError) {
      setMessage(organizersError.message);
      setLoading(false);
      return;
    }

    const loadedOrganizers = (organizersData || []) as OrganizerRow[];
    const firstOrganizerId = loadedOrganizers[0]?.id || "";

    setOrganizers(loadedOrganizers);
    setSelectedOrganizerId(firstOrganizerId);
    setLoading(false);

    if (firstOrganizerId) {
      await loadOrganizerData(firstOrganizerId);
    }
  }

  useEffect(() => {
    loadAccount();
  }, []);

  async function handleSelectOrganizer(organizerId: string) {
    setSelectedOrganizerId(organizerId);
    await loadOrganizerData(organizerId);
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar painel do organizador...</p>
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
          O painel do organizador só aparece para contas ligadas a um
          organizador.
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

  if (organizers.length === 0) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-red-700">
          Sem organizador
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
          Esta conta ainda não tem painel.
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-zinc-400 lg:text-base">
          Conta atual: {email}. Para aparecer aqui, esta conta tem de estar
          ligada a um organizador na tabela organizer_members.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/submeter"
            className="rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
          >
            Submeter evento
          </Link>

          <Link
            href="/perfil"
            className="rounded-full border border-zinc-700 px-6 py-4 text-sm font-bold text-zinc-300"
          >
            Voltar ao perfil
          </Link>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-red-950 bg-red-950/20 p-4 text-sm text-red-300">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Conta
          </p>

          <h2 className="mt-3 break-words text-2xl font-black leading-tight">
            {email}
          </h2>

          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-zinc-600">
            Organizador
          </p>

          {organizers.length > 1 && (
            <div className="mt-6">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Escolher organizador
              </label>

              <select
                value={selectedOrganizerId}
                onChange={(event) => handleSelectOrganizer(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              >
                {organizers.map((organizer) => (
                  <option key={organizer.id} value={organizer.id}>
                    {organizer.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedOrganizer && (
            <div className="mt-6 rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                Organizador ativo
              </p>

              <h3 className="mt-3 text-2xl font-black">
                {selectedOrganizer.name}
              </h3>

              {selectedOrganizer.city && (
                <p className="mt-2 text-sm text-zinc-500">
                  {selectedOrganizer.city}
                </p>
              )}

              {selectedOrganizer.verified && (
                <p className="mt-3 inline-block rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
                  Verificado
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{pendingSubmissions.length}</p>

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

          <div className="mt-6 grid gap-3">
            <Link
              href="/submeter"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Submeter evento
            </Link>

            {selectedOrganizer && (
              <Link
                href={`/organizadores/${selectedOrganizer.slug}`}
                className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
              >
                Ver perfil público
              </Link>
            )}

            <Link
              href="/agenda"
              className="rounded-full border border-zinc-800 px-5 py-4 text-center text-sm font-bold text-zinc-500"
            >
              Ver agenda
            </Link>

            <button
              type="button"
              onClick={() => loadOrganizerData(selectedOrganizerId)}
              disabled={loadingData}
              className="rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500 disabled:opacity-50"
            >
              {loadingData ? "A atualizar..." : "Atualizar painel"}
            </button>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-red-950 bg-red-950/20 p-4 text-xs leading-relaxed text-red-300">
              {message}
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
                  À espera da Paranoid
                </h2>
              </div>

              <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                {pendingSubmissions.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {pendingSubmissions.length === 0 && (
                <EmptyCard text="Não há submissões pendentes para este organizador." />
              )}

              {pendingSubmissions.map((submission) => (
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
                <EmptyCard text="Ainda não há eventos publicados para este organizador." />
              )}

              {publishedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>

          {treatedSubmissions.length > 0 && (
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Histórico
                  </p>

                  <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                    Submissões tratadas
                  </h2>
                </div>

                <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                  {treatedSubmissions.length}
                </span>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {treatedSubmissions.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            </section>
          )}

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
                <EmptyCard text="Não há eventos arquivados para este organizador." />
              )}

              {archivedEvents.map((event) => (
                <EventCard key={event.id} event={event} archived />
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}