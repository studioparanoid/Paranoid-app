"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { joinAlbum } from "@/lib/albums";
import { supabase } from "@/lib/supabase/public";

export default function EntrarNoAlbumPage() {
  const params = useParams();
  const router = useRouter();
  const code = Array.isArray(params?.code) ? params.code[0] : String(params?.code || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function attemptJoin() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/albuns/entrar/${code}`)}`);
      return;
    }
    try {
      const { albumId } = await joinAlbum(code);
      router.replace(`/albuns/${albumId}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Não foi possível entrar no álbum.");
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void attemptJoin(); }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg"><LoadingSkeleton rows={3} /></section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-lg">
        <EmptyState title="Não foi possível entrar no álbum." description={error || "O código pode estar errado ou expirado."} actionLabel="Voltar ao perfil" actionHref="/perfil" />
      </section>
    </main>
  );
}
