"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type EventPublicActionsProps = {
  eventId: string;
  title: string;
  slug: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  city: string | null;
  venueName: string | null;
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

    return Array.isArray(parsedValue) ? parsedValue.map(String) : [];
  } catch {
    return [];
  }
}

function setLocalSavedEvents(eventIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("paranoid_saved_events", JSON.stringify(eventIds));
}

function formatCalendarDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildGoogleCalendarUrl({
  title,
  description,
  startAt,
  endAt,
  city,
  venueName,
}: {
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  city: string | null;
  venueName: string | null;
}) {
  const start = formatCalendarDate(startAt);
  const end = formatCalendarDate(endAt || startAt);

  const params = new URLSearchParams();

  params.set("action", "TEMPLATE");
  params.set("text", title);

  if (start && end) {
    params.set("dates", `${start}/${end}`);
  }

  params.set(
    "details",
    `${description || ""}\n\nEvento encontrado na Paranoid.`
  );

  params.set(
    "location",
    [venueName, city].filter(Boolean).join(", ") || "Local por definir"
  );

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function EventPublicActions({
  eventId,
  title,
  slug,
  description,
  startAt,
  endAt,
  city,
  venueName,
}: EventPublicActionsProps) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDbSavedState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (data) {
        setSaved(true);
      }
    }

    const timer = window.setTimeout(() => {
      const savedEvents = getLocalSavedEvents();
      setSaved(savedEvents.includes(eventId));
      void loadDbSavedState();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [eventId]);

  async function toggleSaved() {
    setMessage("");

    const savedEvents = getLocalSavedEvents();
    const alreadySaved = savedEvents.includes(eventId);

    const nextSavedEvents = alreadySaved
      ? savedEvents.filter((id) => id !== eventId)
      : [...savedEvents, eventId];

    setLocalSavedEvents(nextSavedEvents);
    setSaved(!alreadySaved);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage(
        alreadySaved
          ? "Removido dos guardados neste dispositivo."
          : "Guardado neste dispositivo."
      );
      return;
    }

    if (alreadySaved) {
      await supabase
        .from("saved_events")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId);

      setMessage("Removido dos guardados.");
      return;
    }

    const { error } = await supabase.from("saved_events").insert({
      user_id: user.id,
      event_id: eventId,
    });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      setMessage(`Guardado localmente, mas erro na conta: ${error.message}`);
      return;
    }

    setMessage("Evento guardado.");
  }

  async function shareEvent() {
    setMessage("");

    const url = `${window.location.origin}/eventos/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "Vê este evento na Paranoid.",
          url,
        });

        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copiado.");
    } catch {
      setMessage(url);
    }
  }

  const calendarUrl = buildGoogleCalendarUrl({
    title,
    description,
    startAt,
    endAt,
    city,
    venueName,
  });

  return (
    <section className="mt-8 rounded-[2rem] border border-border bg-black p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-danger">
        Ações
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={toggleSaved}
          className={`rounded-full px-5 py-4 text-sm font-black ${
            saved
              ? "border border-danger bg-danger text-danger"
              : "bg-[#f5f5f2] text-black"
          }`}
        >
          {saved ? "Guardado" : "Guardar evento"}
        </button>

        <button
          type="button"
          onClick={shareEvent}
          className="rounded-full border border-border-strong px-5 py-4 text-sm font-bold text-foreground-secondary"
        >
          Partilhar
        </button>

        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border-strong px-5 py-4 text-center text-sm font-bold text-foreground-secondary"
        >
          Adicionar ao Google Calendar
        </a>
      </div>

      {message && (
        <p className="mt-4 text-center text-sm font-bold text-foreground-muted">
          {message}
        </p>
      )}
    </section>
  );
}
