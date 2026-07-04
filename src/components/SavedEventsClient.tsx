"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";

type SavedEventsClientProps = {
  events?: AppEvent[];
};

function getLocalSavedEvents() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem("paranoid_saved_events");

    if (!value) {
      return [];
    }

    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

function setLocalSavedEvents(eventIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const uniqueEventIds = Array.from(new Set(eventIds));
    window.localStorage.setItem(
      "paranoid_saved_events",
      JSON.stringify(uniqueEventIds)
    );
  } catch {
    // Ignora localStorage bloqueado.
  }
}

export function SavedEventsClient({ events = [] }: SavedEventsClientProps) {
  const safeEvents = Array.isArray(events) ? events : [];

  const [loading, setLoading] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const publishedEventIds = useMemo(() => {
    return safeEvents.map((event) => event.id);
  }, [safeEvents]);

  useEffect(() => {
    async function loadSavedEvents() {
      setLoading(true);
      setMessage("");

      const localSavedIds = getLocalSavedEvents();

      const validLocalSavedIds = localSavedIds.filter((eventId) =>
        publishedEventIds.includes(eventId)
      );

      setSavedEventIds(validLocalSavedIds);
      setLocalSavedEvents(validLocalSavedIds);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: dbSavedRows } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id);

      const dbSavedIds = Array.isArray(dbSavedRows)
        ? dbSavedRows
            .map((row) => String(row.event_id || ""))
            .filter((eventId) => publishedEventIds.includes(eventId))
        : [];

      const mergedSavedIds = Array.from(
        new Set([...validLocalSavedIds, ...dbSavedIds])
      );

      setSavedEventIds(mergedSavedIds);
      setLocalSavedEvents(mergedSavedIds);

      const idsToInsert = validLocalSavedIds.filter(
        (eventId) => !dbSavedIds.includes(eventId)
      );

      for (const eventId of idsToInsert) {
        await supabase.from("saved_events").insert({
          user_id: user.id,
          event_id: eventId,
        });
      }

      setLoading(false);
    }

    loadSavedEvents();
  }, [publishedEventIds]);

  const savedEvents = useMemo(() => {
    return safeEvents.filter((event) => savedEventIds.includes(event.id));
  }, [safeEvents, savedEventIds]);

  async function removeSavedEvent(eventId: string) {
    setMessage("");

    const nextSavedEventIds = savedEventIds.filter((id) => id !== eventId);

    setSavedEventIds(nextSavedEventIds);
    setLocalSavedEvents(nextSavedEventIds);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Evento removido dos guardados neste dispositivo.");
      return;
    }

    const { error } = await supabase
      .from("saved_events")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId);

    if (error) {
      setMessage(`Removido localmente, mas erro na conta: ${error.message}`);
      return;
    }

    setMessage("Evento removido dos guardados.");
  }

  async function cleanSavedEvents() {
    setMessage("");

    const validSavedIds = savedEventIds.filter((eventId) =>
      publishedEventIds.includes(eventId)
    );

    setSavedEventIds(validSavedIds);
    setLocalSavedEvents(validSavedIds);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Guardados limpos neste dispositivo.");
      return;
    }

    const invalidSavedIds = savedEventIds.filter(
      (eventId) => !publishedEventIds.includes(eventId)
    );

    for (const eventId of invalidSavedIds) {
      await supabase
        .from("saved_events")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId);
    }

    setMessage("Guardados limpos.");
  }

  return (
    <div className="mt-8 space-y-7">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-red-700">
          Guardados
        </p>

        <h2 className="mt-3 text-2xl font-black">
          O teu saco de eventos.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Aqui aparecem os eventos que guardaste. Eventos arquivados ou já
          removidos da agenda pública são escondidos automaticamente.
        </p>

        <button
          type="button"
          onClick={cleanSavedEvents}
          className="mt-5 w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
        >
          Limpar guardados inválidos
        </button>

        {message && (
          <p className="mt-4 text-center text-sm font-bold text-zinc-400">
            {message}
          </p>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Lista
            </p>

            <h2 className="mt-2 text-3xl font-black">Eventos guardados</h2>
          </div>

          <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
            {savedEvents.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {loading && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">A carregar guardados...</p>
            </div>
          )}

          {!loading && savedEvents.length === 0 && (
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-500">
                Ainda não tens eventos guardados.
              </p>

              <Link
                href="/agenda"
                className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
              >
                Explorar agenda
              </Link>
            </div>
          )}

          {!loading &&
            savedEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
              >
                {event.image && (
                  <Link
                    href={`/eventos/${event.slug}`}
                    className="mb-4 block h-56 rounded-[1.5rem] bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${event.image})`,
                    }}
                  />
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                      {event.category || "Evento"}
                    </p>

                    <Link href={`/eventos/${event.slug}`}>
                      <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
                        {event.title}
                      </h3>
                    </Link>
                  </div>

                  {event.featured && (
                    <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
                      Destaque
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-sm text-zinc-400">
                  <p>
                    <span className="font-bold text-zinc-300">Data:</span>{" "}
                    {event.date || "Data por definir"}{" "}
                    {event.time ? `· ${event.time}` : ""}
                  </p>

                  <p>
                    <span className="font-bold text-zinc-300">Cidade:</span>{" "}
                    {event.city || "Cidade por definir"}
                  </p>

                  <p>
                    <span className="font-bold text-zinc-300">Espaço:</span>{" "}
                    {event.venue || "Espaço por definir"}
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
                    href={`/eventos/${event.slug}`}
                    className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
                  >
                    Ver evento
                  </Link>

                  <button
                    type="button"
                    onClick={() => removeSavedEvent(event.id)}
                    className="flex-1 rounded-full border border-red-900 px-4 py-3 text-sm font-bold text-red-400"
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}