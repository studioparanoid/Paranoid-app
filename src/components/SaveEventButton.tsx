"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type SaveEventButtonProps = {
  eventId?: string;
  event?: {
    id: string;
  };
};

export function SaveEventButton({ eventId, event }: SaveEventButtonProps) {
  const resolvedEventId = eventId || event?.id || "";

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function checkSavedState() {
      if (!resolvedEventId) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const savedEvents = JSON.parse(
          localStorage.getItem("savedEvents") || "[]"
        ) as string[];

        setSaved(savedEvents.includes(resolvedEventId));
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      setLoggedIn(true);

      const { data, error } = await supabase
        .from("saved_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", resolvedEventId)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      setSaved(Boolean(data));
      setLoading(false);
    }

    checkSavedState();
  }, [resolvedEventId]);

  async function toggleSaved() {
    if (!resolvedEventId || loading) {
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const savedEvents = JSON.parse(
        localStorage.getItem("savedEvents") || "[]"
      ) as string[];

      const nextSavedEvents = savedEvents.includes(resolvedEventId)
        ? savedEvents.filter((id) => id !== resolvedEventId)
        : [...savedEvents, resolvedEventId];

      localStorage.setItem("savedEvents", JSON.stringify(nextSavedEvents));
      setSaved(nextSavedEvents.includes(resolvedEventId));
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    setLoggedIn(true);

    if (saved) {
      const { error } = await supabase
        .from("saved_events")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", resolvedEventId);

      if (error) {
        console.error(error);
      } else {
        setSaved(false);
      }

      setLoading(false);
      return;
    }

    const { error } = await supabase.from("saved_events").insert({
      user_id: user.id,
      event_id: resolvedEventId,
    });

    if (error) {
      console.error(error);
    } else {
      setSaved(true);
    }

    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggleSaved}
      disabled={loading}
      className={`rounded-full px-5 py-3 text-sm font-black disabled:opacity-50 ${
        saved
          ? "border border-red-900 bg-red-950 text-red-300"
          : "bg-[#f2f1ec] text-black"
      }`}
    >
      {loading
        ? "A verificar..."
        : saved
          ? "Guardado"
          : loggedIn
            ? "Guardar na conta"
            : "Guardar"}
    </button>
  );
}