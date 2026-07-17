"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { AppIcon } from "@/components/AppIcon";
import { Button, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ParanoidBookmarkIcon } from "@/components/navigation/ParanoidIconSystem";

type SaveEventButtonProps = {
  eventId?: string;
  event?: {
    id: string;
  };
  compact?: boolean;
  feed?: boolean;
};

export function SaveEventButton({ eventId, event, compact = false, feed = false }: SaveEventButtonProps) {
  const resolvedEventId = eventId || event?.id || "";

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const { toast } = useToast();

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
    const wasSaved = saved;
    setSaved(!wasSaved);

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
      toast({ message: wasSaved ? "Removido dos guardados." : "Evento guardado.", tone: "success" });
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
        setSaved(wasSaved);
        toast({ message: "Não foi possível atualizar os guardados.", tone: "error" });
      } else {
        setSaved(false);
        toast({ message: "Removido dos guardados.", tone: "success" });
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
      setSaved(wasSaved);
      toast({ message: "Não foi possível guardar o evento.", tone: "error" });
    } else {
      setSaved(true);
      toast({ message: "Evento guardado.", tone: "success" });
    }

    setLoading(false);
  }

  if (feed) {
    return (
      <button
        type="button"
        onClick={toggleSaved}
        disabled={loading}
        aria-label={saved ? "Remover dos guardados" : "Guardar evento"}
        aria-pressed={saved}
        aria-busy={loading}
        className={`focus-ring pressable inline-flex min-h-9 items-center gap-2 text-xs font-black transition-colors ${
          saved ? "text-red-600" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
        } disabled:opacity-45`}
      >
        <ParanoidBookmarkIcon className="h-[1.05rem] w-[1.05rem]" active={saved} />
        {saved ? "Guardado" : "Guardar"}
      </button>
    );
  }

  if (compact) {
    return (
      <Button
        onClick={toggleSaved}
        disabled={loading}
        size="icon"
        variant="ghost"
        aria-label={saved ? "Remover dos guardados" : "Guardar evento"}
        aria-pressed={saved}
        aria-busy={loading}
        title={saved ? "Remover dos guardados" : "Guardar evento"}
        className={`border backdrop-blur-sm ${saved ? "border-red-500 bg-red-600 text-white hover:bg-red-500" : "border-white/20 bg-black/70 text-white hover:border-white/40 hover:bg-black/90"}`}
      >
        <AppIcon name="bookmark" className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      </Button>
    );
  }

  return (
    <LoadingButton
      onClick={toggleSaved}
      disabled={loading}
      loading={loading}
      loadingText="A guardar..."
      size="md"
      variant={saved ? "danger" : "primary"}
      aria-label={saved ? "Remover dos guardados" : "Guardar evento"}
    >
      {saved
          ? "Guardado"
          : loggedIn
            ? "Guardar na conta"
            : "Guardar"}
    </LoadingButton>
  );
}
