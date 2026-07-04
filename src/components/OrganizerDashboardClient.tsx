"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";

type OrganizerDashboardClientProps = {
  events?: unknown[];
  initialEvents?: unknown[];
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
  instagram: string | null;
};

type OrganizerMembershipRaw = {
  organizer_id: string;
  role: string;
  organizers: OrganizerRow | OrganizerRow[] | null;
};

type OrganizerMembership = {
  organizer_id: string;
  role: string;
  organizer: OrganizerRow | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  organizer_id: string | null;
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

function getOrganizerFromRelation(
  value: OrganizerRow | OrganizerRow[] | null
) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function normalizeMemberships(rows: OrganizerMembershipRaw[]) {
  return rows.map((row) => ({
    organizer_id: row.organizer_id,
    role: row.role,
    organizer: getOrganizerFromRelation(row.organizers),
  }));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return value;
}

export function OrganizerDashboardClient({
  events: _events,
  initialEvents: _initialEvents,
}: OrganizerDashboardClientProps) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [memberships, setMemberships] = useState<OrganizerMembership[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState("");

  const [publishedEvents, setPublishedEvents] = useState<EventRow[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<
    EventSubmission[]
  >([]);

  const selectedMembership = memberships.find(
    (membership) => membership.organizer_id === selectedOrganizerId
  );

  const selectedOrganizer = selectedMembership?.organizer || null;

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Tens de iniciar sessão como organizador.");
      setLoading(false);
      return;
    }

    const { data: membershipsData, error: membershipsError } = await supabase
      .from("organizer_members")
      .select(
        `
        organizer_id,
        role,
        organizers (
          id,
          slug,
          name,
          city,
          description,
          pack,
          verified,
          instagram
        )
      `
      )
      .eq("user_id", user.id);

    if (membershipsError) {
      setMessage(`Erro ao carregar organizadores: ${membershipsError.message}`);
      setLoading(false);
      return;
    }

    const loadedMemberships = normalizeMemberships(
      (membershipsData || []) as unknown as OrganizerMembershipRaw[]
    );

    setMemberships(loadedMemberships);

    const organizerIds = loadedMemberships
      .map((membership) => membership.organizer_id)
      .filter(Boolean);

    if (organizerIds.length === 0) {
      setPublishedEvents([]);
      setPendingSubmissions([]);
      setMessage("Esta conta ainda não está ligada a nenhum organizador.");
      setLoading(false);
      return;
    }

    const activeOrganizerId = selectedOrganizerId || organizerIds[0];

    setSelectedOrganizerId(activeOrganizerId);

    const [eventsResult, submissionsResult] = await Promise.all([
      supabase
        .from("events")
        .select(
          "id,slug,title,city,venue_name,organizer_id,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
        )
        .eq("organizer_id", activeOrganizerId)
        .eq("status", "published")
        .order("start_at", { ascending: true }),
      supabase
        .from("event_submissions")
        .select("*")
        .eq("organizer_id", activeOrganizerId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    if (eventsResult.error) {
      setMessage(`Erro ao carregar eventos: ${eventsResult.error.message}`);
      setPublishedEvents([]);
    } else {
      setPublishedEvents((eventsResult.data || []) as EventRow[]);
    }

    if (submissionsResult.error) {
      setMessage(
        `Erro ao carregar submissões: ${submissionsResult.error.message}`
      );
      setPendingSubmissions([]);
    } else {
      setPendingSubmissions(
        (submissionsResult.data || []) as EventSubmission[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleOrganizerChange(organizerId: string) {
    setSelectedOrganizerId(organizerId);
    setLoading(true);
    setMessage("");

    const [eventsResult, submissionsResult] = await Promise.all([
      supabase
        .from("events")
        .select(
          "id,slug,title,city,venue_name,organizer_id,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
        )
        .eq("organizer_id", organizerId)
        .eq("status", "published")
        .order("start_at", { ascending: true }),
      supabase
        .from("event_submissions")
        .select("*")
        .eq("organizer_id", organizerId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    if (eventsResult.error) {
      setMessage(`Erro ao carregar eventos: ${eventsResult.error.message}`);
      setPublishedEvents([]);
    } else {
      setPublishedEvents((eventsResult.data || []) as EventRow[]);
    }

    if (submissionsResult.error) {
      setMessage(
        `Erro ao carregar submissões: ${submissionsResult.error.message}`
      );
      setPendingSubmissions([]);
    } else {
      setPendingSubmissions(
        (submissionsResult.data || []) as EventSubmission[]
      );
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar painel do organizador...</p>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="mt-8 space-y-5">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-zinc-400">
            Esta conta ainda não está ligada a nenhum organizador.
          </p>

          {message && (
            <p className="mt-4 text-sm font-bold text-red-400">{message}</p>
          )}
        </div>

        <Link
          href="/submeter"
          className="block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
        >
          Submeter evento
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-red-950 bg-red-950/20 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-red-500">
          Organizador
        </p>

        {memberships.length > 1 ? (
          <select
            value={selectedOrganizerId}
            onChange={(event) => handleOrganizerChange(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
          >
            {memberships.map((membership) => (
              <option
                key={membership.organizer_id}
                value={membership.organizer_id}
              >
                {membership.organizer?.name || "Organizador"}
              </option>
            ))}
          </select>
        ) : (
          <h2 className="mt-3 text-3xl font-black">
            {selectedOrganizer?.name || "Organizador"}
          </h2>
        )}

        <div className="mt-4 space-y-1 text-sm text-zinc-400">
          {selectedOrganizer?.city && <p>{selectedOrganizer.city}</p>}

          {selectedMembership?.role && (
            <p>
              <span className="font-bold text-zinc-300">Cargo:</span>{" "}
              {selectedMembership.role}
            </p>
          )}

          {selectedOrganizer?.pack && (
            <p>
              <span className="font-bold text-zinc-300">Pack:</span>{" "}
              {selectedOrganizer.pack}
            </p>
          )}
        </div>

        {selectedOrganizer?.slug && (
          <Link
            href={`/organizadores/${selectedOrganizer.slug}`}
            className="mt-5 block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
          >
            Ver perfil público
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {pendingSubmissions.length}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Submissões
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-3xl font-black text-[#f2f1ec]">
            {publishedEvents.length}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Publicados
          </p>
        </div>
      </section>

      <Link
        href="/submeter"
        className="block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
      >
        Submeter novo evento
      </Link>

      <button
        type="button"
        onClick={loadDashboard}
        className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
      >
        Atualizar painel
      </button>

      {message && (
        <div className="rounded-[2rem] border border-red-950 bg-red-950/20 p-4">
          <p className="text-sm font-bold text-red-400">{message}</p>
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
            {pendingSubmissions.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {pendingSubmissions.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">
                Não tens submissões pendentes neste organizador.
              </p>
            </div>
          )}

          {pendingSubmissions.map((submission) => (
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
                  <span className="font-bold text-zinc-300">Data:</span>{" "}
                  {formatDate(submission.event_date)}{" "}
                  {submission.event_time ? `· ${submission.event_time}` : ""}
                </p>

                {submission.is_multi_day && submission.end_date && (
                  <p>
                    <span className="font-bold text-zinc-300">Fim:</span>{" "}
                    {submission.end_date}
                  </p>
                )}

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

              <Link
                href={`/organizador/submissoes/${submission.id}`}
                className="mt-4 block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
              >
                Ver submissão
              </Link>
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
            {publishedEvents.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {publishedEvents.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">
                Ainda não tens eventos publicados neste organizador.
              </p>
            </div>
          )}

          {publishedEvents.map((event) => (
            <article
              key={event.id}
              className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
            >
              {event.image_url && (
                <div
                  className="mb-4 h-48 rounded-[1.5rem] bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${event.image_url})`,
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
                  {event.venue_name || "Por definir"}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Data:</span>{" "}
                  {formatDate(event.display_date)}{" "}
                  {event.display_time ? `· ${event.display_time}` : ""}
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

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/organizador/eventos/${event.id}`}
                  className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
                >
                  Editar
                </Link>

                <Link
                  href={`/eventos/${event.slug}`}
                  className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
                >
                  Ver
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}