"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";

type AdminEventActionsProps = {
  event: AppEvent;
  mode?: "published" | "archived";
  onDone?: () => void | Promise<void>;
  onArchived?: (eventId: string) => void;
  onRestored?: (eventId: string) => void;
};

type StatusEventRow = {
  id: string;
  status: string;
};

export function AdminEventActions({
  event,
  mode = "published",
  onDone,
  onArchived,
  onRestored,
}: AdminEventActionsProps) {
  const router = useRouter();

  const [featured, setFeatured] = useState(Boolean(event.featured));
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFeatured() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("events")
      .update({
        featured: !featured,
      })
      .eq("id", event.id)
      .select("id,featured")
      .single();

    setLoading(false);

    if (error || !data) {
      setMessage(
        `Erro ao atualizar destaque: ${
          error?.message || "evento não foi atualizado"
        }`
      );
      return;
    }

    setFeatured(!featured);
    setMessage(!featured ? "Evento destacado." : "Destaque removido.");

    if (onDone) {
      await onDone();
    }

    router.refresh();
  }

  async function archiveEvent() {
    const confirmed = window.confirm(
      `Arquivar "${event.title}"?\n\nO evento sai da agenda pública, mas não é apagado da base de dados.`
    );

    if (!confirmed) {
      return;
    }

    setArchiving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("events")
      .update({
        status: "archived",
        featured: false,
      })
      .eq("id", event.id)
      .select("id,status")
      .single();

    setArchiving(false);

    if (error || !data) {
      setMessage(
        `Erro ao arquivar evento: ${
          error?.message || "o Supabase não devolveu confirmação"
        }`
      );
      return;
    }

    const archivedEvent = data as StatusEventRow;

    if (archivedEvent.status !== "archived") {
      setMessage(
        `Erro: o evento continua com status "${archivedEvent.status}".`
      );
      return;
    }

    setFeatured(false);
    setMessage("Evento arquivado.");

    if (onArchived) {
      onArchived(event.id);
    }

    if (onDone) {
      await onDone();
    }

    router.refresh();
  }

  async function restoreEvent() {
    const confirmed = window.confirm(
      `Republicar "${event.title}"?\n\nO evento volta a aparecer na agenda pública.`
    );

    if (!confirmed) {
      return;
    }

    setRestoring(true);
    setMessage("");

    const { data, error } = await supabase
      .from("events")
      .update({
        status: "published",
      })
      .eq("id", event.id)
      .select("id,status")
      .single();

    setRestoring(false);

    if (error || !data) {
      setMessage(
        `Erro ao republicar evento: ${
          error?.message || "o Supabase não devolveu confirmação"
        }`
      );
      return;
    }

    const restoredEvent = data as StatusEventRow;

    if (restoredEvent.status !== "published") {
      setMessage(
        `Erro: o evento continua com status "${restoredEvent.status}".`
      );
      return;
    }

    setMessage("Evento republicado.");

    if (onRestored) {
      onRestored(event.id);
    }

    if (onDone) {
      await onDone();
    }

    router.refresh();
  }

  if (mode === "archived") {
    return (
      <div className="mt-4">
        <div className="flex gap-2">
          <Link
            href={`/admin/eventos/${event.slug}`}
            className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
          >
            Editar
          </Link>

          <button
            type="button"
            onClick={restoreEvent}
            disabled={restoring}
            className="flex-1 rounded-full border border-green-900 bg-green-950/30 px-4 py-3 text-sm font-black text-green-400 disabled:opacity-50"
          >
            {restoring ? "A republicar..." : "Republicar"}
          </button>
        </div>

        {message && (
          <p className="mt-3 text-center text-sm font-bold text-zinc-400">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <Link
          href={`/admin/eventos/${event.slug}`}
          className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
        >
          Editar
        </Link>

        <Link
          href={`/eventos/${event.slug}`}
          className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
        >
          Ver
        </Link>
      </div>

      <button
        type="button"
        onClick={toggleFeatured}
        disabled={loading || archiving}
        className={`mt-3 w-full rounded-full px-4 py-3 text-sm font-black disabled:opacity-50 ${
          featured
            ? "border border-red-900 bg-red-950 text-red-300"
            : "border border-zinc-700 text-zinc-300"
        }`}
      >
        {loading ? "A atualizar..." : featured ? "Remover destaque" : "Destacar"}
      </button>

      <button
        type="button"
        onClick={archiveEvent}
        disabled={loading || archiving}
        className="mt-3 w-full rounded-full border border-yellow-900 bg-yellow-950/20 px-4 py-3 text-sm font-black text-yellow-500 disabled:opacity-50"
      >
        {archiving ? "A arquivar..." : "Arquivar / despublicar"}
      </button>

      {message && (
        <p className="mt-3 text-center text-sm font-bold text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}