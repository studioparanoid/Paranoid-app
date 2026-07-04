"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminEventActions } from "@/components/AdminEventActions";
import { AdminSubmissionActions } from "@/components/AdminSubmissionActions";
import { LogoutButton } from "@/components/LogoutButton";
import { type AppEvent } from "@/lib/events";
import { type EventSubmission } from "@/lib/submissions";
import { supabase } from "@/lib/supabase/public";

type AdminDashboardClientProps = {
  events: AppEvent[];
};

export function AdminDashboardClient({ events }: AdminDashboardClientProps) {
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  async function loadSubmissions() {
    setLoadingSubmissions(true);

    const { data, error } = await supabase
      .from("event_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setSubmissions([]);
      setLoadingSubmissions(false);
      return;
    }

    setSubmissions((data || []) as EventSubmission[]);
    setLoadingSubmissions(false);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  const pendingSubmissions = submissions.filter(
    (submission) => submission.status === "pending"
  );

  const approvedSubmissions = submissions.filter(
    (submission) => submission.status === "approved"
  );

  const rejectedSubmissions = submissions.filter(
    (submission) => submission.status === "rejected"
  );

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.35em] text-red-700">
            Admin Paranoid
          </p>

          <LogoutButton />
        </div>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Controla o caos.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Aprova submissões, gere eventos publicados, destaca escolhas e
          alimenta a rede cultural da Paranoid.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link
            href="/admin/rede"
            className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
              Rede
            </p>

            <h2 className="text-2xl font-black">Gerir rede</h2>

            <p className="mt-2 text-sm text-zinc-500">
              Criar artistas, espaços e organizadores.
            </p>
          </Link>

          <Link
            href="/descobrir"
            className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
              Público
            </p>

            <h2 className="text-2xl font-black">Ver rede</h2>

            <p className="mt-2 text-sm text-zinc-500">
              Abrir página Descobrir.
            </p>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-center">
            <p className="text-2xl font-black">{pendingSubmissions.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Pendentes</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-center">
            <p className="text-2xl font-black">{approvedSubmissions.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Aprovadas</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-center">
            <p className="text-2xl font-black">{rejectedSubmissions.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Rejeitadas</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-center">
            <p className="text-2xl font-black">{events.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Eventos</p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Submissões pendentes</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Eventos enviados pelo público ou por organizadores.
          </p>

          <div className="mt-4 space-y-4">
            {loadingSubmissions && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">A carregar submissões...</p>
              </div>
            )}

            {!loadingSubmissions &&
              pendingSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div
                    className={`mb-4 h-40 rounded-2xl bg-cover bg-center ${
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

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                        {submission.category}
                      </p>

                      <h3 className="text-2xl font-black">
                        {submission.title}
                      </h3>
                    </div>

                    <span className="rounded-full border border-yellow-900 bg-yellow-950/30 px-3 py-1 text-xs font-black uppercase text-yellow-500">
                      Pendente
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-zinc-400">
                    {submission.event_date || "Data por definir"} ·{" "}
                    {submission.event_time || "Hora por definir"}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {submission.venue || "Espaço por definir"},{" "}
                    {submission.city || "Cidade por definir"}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Organizador:{" "}
                    {submission.organizer || "Organizador por definir"}
                  </p>

                  {submission.price && (
                    <p className="mt-3 text-sm font-bold text-zinc-300">
                      {submission.price}
                    </p>
                  )}

                  {submission.description && (
                    <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-400">
                      {submission.description}
                    </p>
                  )}

                  <AdminSubmissionActions
                    submission={submission}
                    onDone={loadSubmissions}
                  />
                </article>
              ))}

            {!loadingSubmissions && pendingSubmissions.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">
                  Não há submissões pendentes.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Eventos publicados</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Eventos já visíveis na Agenda.
          </p>

          <div className="mt-4 space-y-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
              >
                <div
                  className={`mb-4 h-40 rounded-2xl bg-cover bg-center ${
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

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                      {event.category}
                    </p>

                    <h3 className="text-2xl font-black">{event.title}</h3>
                  </div>

                  {event.featured && (
                    <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
                      Destaque
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm text-zinc-400">
                  {event.date} · {event.time}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {event.venue}, {event.city}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Organizador: {event.organizer}
                </p>

                <AdminEventActions event={event} />
              </article>
            ))}

            {events.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">
                  Ainda não há eventos publicados.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}