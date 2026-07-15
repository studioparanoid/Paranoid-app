"use client";

import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/public";

type AccountState = "loading" | "guest" | "authenticated";

export function AccountCommunityCard() {
  const [state, setState] = useState<AccountState>("loading");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setState(data.user ? "authenticated" : "guest");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(session?.user ? "authenticated" : "guest");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return <div className="skeleton-shimmer mt-5 h-52 rounded-lg sm:h-40" role="status" aria-label="A preparar a tua área" />;
  }

  const authenticated = state === "authenticated";

  return (
    <section className="shadow-card mt-5 grid gap-6 rounded-lg border border-zinc-900 bg-zinc-950/55 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8 lg:p-10">
      <div>
        <p className="text-[0.65rem] font-black uppercase tracking-[0.32em] text-red-500">
          {authenticated ? "A tua Paranoid" : "Comunidade · Organizador · Artista"}
        </p>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl">
          {authenticated ? "Continua a explorar." : "Faz parte da Paranoid."}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          {authenticated
            ? "Volta ao teu feed ou gere a tua conta."
            : "Guarda eventos, segue artistas e participa na cultura que te rodeia."}
        </p>
      </div>
      <div className="grid gap-3 sm:min-w-44">
        {authenticated ? (
          <>
            <LinkButton href="/para-ti">Para ti</LinkButton>
            <LinkButton href="/perfil" variant="secondary">Ver perfil</LinkButton>
          </>
        ) : (
          <>
            <LinkButton href="/registar">Criar conta</LinkButton>
            <LinkButton href="/login" variant="secondary">Entrar</LinkButton>
          </>
        )}
      </div>
    </section>
  );
}
