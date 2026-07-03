"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminSubmissionActions } from "@/components/AdminSubmissionActions";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";
import { type EventSubmission } from "@/lib/submissions";
import { AdminEventActions } from "@/components/AdminEventActions";
import { LogoutButton } from "@/components/LogoutButton";

type AdminDashboardClientProps = {
  events: AppEvent[];
};

export function AdminDashboardClient({ events }: AdminDashboardClientProps) {
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSubmissions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("event_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setSubmissions((data || []) as EventSubmission[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  const pendingSubmissions = submissions.filter(
    (submission) => submission.status === "pending"
  );

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
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
          Submissões reais vindas do Supabase. Só admin autenticado mexe aqui.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{events.length}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Publicados
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{pendingSubmissions.length}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Pendentes
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">
              {events.filter((event) => event.featured).length}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Destaques
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Submissões pendentes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Eventos enviados pelo formulário público.
          </p>

          <div className="mt-4 space-y-4">
            {loading && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">A carregar submissões...</p>
              </div>
            )}

            {!loading &&
              pendingSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                        {submission.category}
                      </p>

                      <h3 className="text-2xl font-black">
                        {submission.title}
                      </h3>

                      <p className="mt-2 text-sm text-zinc-400">
                        {submission.event_date || "Data por definir"} ·{" "}
                        {submission.event_time || "Hora por definir"}
                      </p>

                      <p className="text-sm text-zinc-500">
                        {submission.venue || "Espaço por definir"},{" "}
                        {submission.city}
                      </p>

                      {submission.organizer && (
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-600">
                          {submission.organizer}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full border border-yellow-900 bg-yellow-950 px-3 py-1 text-xs font-bold text-yellow-400">
                      {submission.status}
                    </span>
                  </div>

                  {submission.description && (
                    <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                      {submission.description}
                    </p>
                  )}

                  <AdminSubmissionActions
                    submission={submission}
                    onDone={loadSubmissions}
                  />
                </article>
              ))}

            {!loading && pendingSubmissions.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">
                  Não há submissões pendentes. A cave está calma.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Eventos publicados</h2>

          <div className="mt-4 space-y-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
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
                  </div>

                  {event.featured && (
                    <span className="rounded-full bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
                      Destaque
                    </span>
                  )}
                </div>

                <AdminEventActions event={event} />
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}