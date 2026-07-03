"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

type AdminEventActionsProps = {
  event: {
    id: string;
    slug: string;
    featured: boolean;
  };
};

export function AdminEventActions({ event }: AdminEventActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFeatured() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("events")
      .update({ featured: !event.featured })
      .eq("id", event.id);

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage("Erro ao alterar destaque.");
      return;
    }

    setMessage(event.featured ? "Destaque removido." : "Evento destacado.");
    router.refresh();
  }

  return (
    <div>
      <div className="mt-4 flex gap-2">
        <Link
          href={`/eventos/${event.slug}`}
          className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
        >
          Ver
        </Link>

        <button
          type="button"
          onClick={toggleFeatured}
          disabled={loading}
          className={`flex-1 rounded-full px-4 py-3 text-sm font-bold disabled:opacity-50 ${
            event.featured
              ? "border border-red-900 bg-red-950 text-red-300"
              : "border border-zinc-700 text-zinc-300"
          }`}
        >
          {loading
            ? "A guardar..."
            : event.featured
              ? "Remover destaque"
              : "Destacar"}
        </button>
      </div>

      {message && (
        <p className="mt-3 text-sm font-bold text-zinc-500">{message}</p>
      )}
    </div>
  );
}