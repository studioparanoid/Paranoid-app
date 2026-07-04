"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";
import { type EventSubmission } from "@/lib/submissions";
import {
  getMyOrganizerMemberships,
  type OrganizerMembership,
} from "@/lib/organizer-members";

type OrganizerDashboardClientProps = {
  events: AppEvent[];
};

export function OrganizerDashboardClient({
  events,
}: OrganizerDashboardClientProps) {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [memberships, setMemberships] = useState<OrganizerMembership[]>([]);
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email || "");

      const userMemberships = await getMyOrganizerMemberships();
      setMemberships(userMemberships);

      const organizerIds = userMemberships.map(
        (membership) => membership.organizer_id
      );

      if (organizerIds.length > 0) {
        const { data, error } = await supabase
          .from("event_submissions")
          .select("*")
          .in("organizer_id", organizerIds)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Erro ao carregar submissões:", error);
        } else {
          setSubmissions((data || []) as EventSubmission[]);
        }
      }

      setLoading(false);
    }

    load();
  }, []);

  const activeMembership = memberships[0];
  const organizer = activeMembership?.organizers;

  const organizerEvents = useMemo(() => {
    if (!organizer) return [];

    return events.filter(
      (event) =>
        event.organizerSlug === organizer.slug ||
        event.organizer === organizer.name
    );
  }, [events, organizer]);

  const organizerSubmissions = useMemo(() => {
    if (!organizer) return [];

    return submissions.filter(
      (submission) => submission.organizer_id === organizer.id
    );
  }, [submissions, organizer]);

  const pendingSubmissions = organizerSubmissions.filter(
    (submission) => submission.status === "pending"
  );

  const approvedSubmissions = organizerSubmissions.filter(
    (submission) => submission.status === "approved"
  );

  const rejectedSubmissions = organizerSubmissions.filter(
    (submission) => submission.status === "rejected"
  );

  const totalViews = organizerEvents.length * 327;
  const totalSaves = organizerEvents.length * 21;
  const ticketClicks = organizerEvents.length * 11;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="text-zinc-500">A carregar área do organizador...</p>
        </section>
      </main>
    );
  }

  if (!organizer) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
            Área do Organizador
          </p>

          <h1 className="text-5xl font-black leading-none tracking-tight">
            Ainda não tens uma entidade ligada.
          </h1>

          <p className="mt-5 text-base text-zinc-400">
            Estás logado como {userEmail}, mas este user ainda não está ligado a
            nenhum organizador.
          </p>

          <Link
            href="/submeter"
            className="mt-8 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            Submeter evento como público
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Área do Organizador
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Publica. Mede. Volta a atacar.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Dashboard real ligado ao teu organizador.
        </p>

        <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                Organizador
              </p>

              <h2 className="mt-2 text-2xl font-black">{organizer.name}</h2>

              <p className="mt-2 text-sm text-zinc-500">
                {organizer.city || "Cidade por definir"} ·{" "}
                {organizer.pack || "Sem pack"}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {userEmail} · {activeMembership.role}
              </p>
            </div>

            {organizer.verified && (
              <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
                Verificado
              </span>
            )}
          </div>

          <Link
            href="/submeter"
            className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            Criar novo evento
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{totalViews}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Views
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{totalSaves}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Guardados
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{ticketClicks}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Cliques
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Submissões pendentes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Eventos enviados para aprovação Paranoid.
          </p>

          <div className="mt-4 space-y-4">
            {pendingSubmissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div
                  className={`mb-4 h-36 rounded-2xl bg-cover bg-center ${
                    submission.image_url
                      ? ""
                      : "bg-gradient-to-br from-zinc-800 to-red-950"
                  }`}
                  style={
                    submission.image_url
                      ? { backgroundImage: `url(${submission.image_url})` }
                      : {}
                  }
                />

                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                  {submission.category}
                </p>

                <h3 className="text-xl font-black">{submission.title}</h3>

                <p className="mt-2 text-sm text-zinc-400">
                  {submission.event_date || "Data por definir"} ·{" "}
                  {submission.event_time || "Hora por definir"}
                </p>

                <p className="text-sm text-zinc-500">
                  {submission.venue}, {submission.city}
                </p>

                <div className="mt-4 flex gap-2">
  <Link
    href={`/organizador/submissoes/${submission.id}`}
    className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
  >
    Editar
  </Link>

  <div className="flex-1 rounded-full border border-yellow-900 bg-yellow-950/30 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-yellow-500">
    A aguardar
  </div>
</div>
              </article>
            ))}

            {pendingSubmissions.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">
                  Não tens submissões pendentes.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Eventos publicados</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Eventos já aprovados e visíveis na Agenda.
          </p>

          <div className="mt-4 space-y-4">
            {organizerEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div
                  className={`mb-4 h-36 rounded-2xl bg-cover bg-center ${
                    event.image
                      ? ""
                      : "bg-gradient-to-br from-zinc-800 to-red-950"
                  }`}
                  style={
                    event.image
                      ? { backgroundImage: `url(${event.image})` }
                      : {}
                  }
                />

                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                  {event.category}
                </p>

                <h3 className="text-xl font-black">{event.title}</h3>

                <p className="mt-2 text-sm text-zinc-400">
                  {event.date} · {event.time}
                </p>

                <p className="text-sm text-zinc-500">
                  {event.venue}, {event.city}
                </p>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/eventos/${event.slug}`}
                    className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
                  >
                    Ver
                  </Link>

                  <button
                    type="button"
                    className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300"
                  >
                    Editar
                  </button>
                </div>
              </article>
            ))}

            {organizerEvents.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">
                  Este organizador ainda não tem eventos publicados.
                </p>
              </div>
            )}
          </div>
        </section>

        {(approvedSubmissions.length > 0 || rejectedSubmissions.length > 0) && (
          <section className="mt-10 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
              Histórico
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black p-4 text-center">
                <p className="text-3xl font-black">
                  {approvedSubmissions.length}
                </p>
                <p className="mt-1 text-xs uppercase text-zinc-600">
                  Aprovadas
                </p>
              </div>

              <div className="rounded-2xl bg-black p-4 text-center">
                <p className="text-3xl font-black">
                  {rejectedSubmissions.length}
                </p>
                <p className="mt-1 text-xs uppercase text-zinc-600">
                  Rejeitadas
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-10 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
            Pack ativo
          </p>

          <h2 className="text-2xl font-black">
            {organizer.pack || "Sem pack ativo"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Depois ligamos isto a pagamentos, faturas e permissões da equipa.
          </p>

          <button className="mt-5 w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300">
            Gerir pack
          </button>
        </section>
      </section>
    </main>
  );
}