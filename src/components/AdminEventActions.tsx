"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";

type AdminEventActionsProps = {
  event: AppEvent;
};

export function AdminEventActions({ event }: AdminEventActionsProps) {
  const router = useRouter();

  const [featured, setFeatured] = useState(Boolean(event.featured));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFeatured() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("events")
      .update({
        featured: !featured,
      })
      .eq("id", event.id);

    setLoading(false);

    if (error) {
      setMessage("Erro ao atualizar destaque.");
      return;
    }

    setFeatured(!featured);
    setMessage(!featured ? "Evento destacado." : "Destaque removido.");
    router.refresh();
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <Link
          href={`/admin/eventos/${event.id}`}
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
        disabled={loading}
        className={`mt-3 w-full rounded-full px-4 py-3 text-sm font-black disabled:opacity-50 ${
          featured
            ? "border border-red-900 bg-red-950 text-red-300"
            : "border border-zinc-700 text-zinc-300"
        }`}
      >
        {loading ? "A atualizar..." : featured ? "Remover destaque" : "Destacar"}
      </button>

      {message && (
        <p className="mt-3 text-center text-sm font-bold text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}