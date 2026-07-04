"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";
import { EventCard } from "@/components/EventCard";

type SavedEventsClientProps = {
  events: AppEvent[];
};

export function SavedEventsClient({ events }: SavedEventsClientProps) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadSavedEvents() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const localSavedEvents = JSON.parse(
          localStorage.getItem("savedEvents") || "[]"
        ) as string[];

        setSavedEventIds(localSavedEvents);
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      setLoggedIn(true);

      const { data, error } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setSavedEventIds((data || []).map((item) => item.event_id));
      setLoading(false);
    }

    loadSavedEvents();
  }, []);

  const savedEvents = events.filter((event) => savedEventIds.includes(event.id));

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-400">A carregar guardados...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {!loggedIn && (
        <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
            Guardados locais
          </p>

          <h2 className="text-2xl font-black">Estão só neste browser.</h2>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Cria conta para manteres os eventos guardados no telemóvel,
            computador e futuras versões da app.
          </p>

          <Link
            href="/registar"
            className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            Criar conta
          </Link>
        </section>
      )}

      {loggedIn && (
        <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
            Conta Paranoid
          </p>

          <h2 className="text-2xl font-black">
            {savedEvents.length} evento{savedEvents.length !== 1 ? "s" : ""} guardado
            {savedEvents.length !== 1 ? "s" : ""}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Estes guardados já ficam ligados à tua conta.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-black">Eventos guardados</h2>

        <div className="mt-4 space-y-4">
          {savedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {savedEvents.length === 0 && (
          <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-400">
              Ainda não guardaste eventos.
            </p>

            <Link
              href="/agenda"
              className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Ver agenda
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}