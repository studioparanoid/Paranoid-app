"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/public";

type AdminEventActionsProps = {
  event?: {
    id: string;
    slug: string;
    featured?: boolean | null;
    status?: string | null;
  };
  eventId?: string;
  slug?: string;
  featured?: boolean;
  mode?: "published" | "archived";
};

export function AdminEventActions({
  event,
  eventId,
  slug,
  featured,
  mode,
}: AdminEventActionsProps) {
  const resolvedEventId = event?.id || eventId || "";
  const resolvedSlug = event?.slug || slug || "";
  const resolvedFeatured =
    typeof featured === "boolean" ? featured : Boolean(event?.featured);
  const resolvedMode =
    mode || (event?.status === "archived" ? "archived" : "published");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function updateEventStatus(nextStatus: "published" | "archived") {
    setMessage("");

    if (!resolvedEventId) {
      setMessage("Evento inválido.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .update({
        status: nextStatus,
      })
      .eq("id", resolvedEventId)
      .select("id,status")
      .single();

    setLoading(false);

    if (error) {
      setMessage(`Erro: ${error.message}`);
      return;
    }

    if (data?.status !== nextStatus) {
      setMessage("A operação não confirmou o novo estado.");
      return;
    }

    window.location.reload();
  }

  async function toggleFeatured() {
    setMessage("");

    if (!resolvedEventId) {
      setMessage("Evento inválido.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("events")
      .update({
        featured: !resolvedFeatured,
      })
      .eq("id", resolvedEventId);

    setLoading(false);

    if (error) {
      setMessage(`Erro: ${error.message}`);
      return;
    }

    window.location.reload();
  }

  if (!resolvedEventId) {
    return (
      <div className="rounded-2xl border border-red-950 bg-red-950/20 p-4 text-sm font-bold text-red-300">
        Evento inválido.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Link
          href={`/admin/eventos/${resolvedSlug || resolvedEventId}`}
          className="rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
        >
          Editar
        </Link>

        {resolvedMode === "published" && resolvedSlug && (
          <Link
            href={`/eventos/${resolvedSlug}`}
            className="rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
          >
            Ver público
          </Link>
        )}

        {resolvedMode === "published" && (
          <>
            <button
              type="button"
              onClick={toggleFeatured}
              disabled={loading}
              className="rounded-full border border-red-900 px-4 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
            >
              {resolvedFeatured ? "Remover destaque" : "Destacar"}
            </button>

            <button
              type="button"
              onClick={() => updateEventStatus("archived")}
              disabled={loading}
              className="rounded-full border border-zinc-800 px-4 py-3 text-sm font-bold text-zinc-500 disabled:opacity-50"
            >
              Arquivar / despublicar
            </button>
          </>
        )}

        {resolvedMode === "archived" && (
          <button
            type="button"
            onClick={() => updateEventStatus("published")}
            disabled={loading}
            className="rounded-full bg-[#f2f1ec] px-4 py-3 text-sm font-black text-black disabled:opacity-50"
          >
            Republicar
          </button>
        )}
      </div>

      {message && (
        <p className="text-center text-xs font-bold text-zinc-500">
          {message}
        </p>
      )}
    </div>
  );
}