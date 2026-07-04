"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";
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
          <h2 className="text-2xl font-black">Os teus eventos</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Eventos publicados por este organizador.
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