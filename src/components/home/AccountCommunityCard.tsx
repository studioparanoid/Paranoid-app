"use client";

import { LinkButton } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";

export function AccountCommunityCard() {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="skeleton-shimmer mx-auto mt-4 h-32 max-w-4xl rounded-lg" role="status" aria-label="A preparar a tua área" />;
  }

  if (user) return null;

  return (
    <section className="mx-auto mt-4 grid max-w-4xl gap-5 border-t border-[var(--border)] py-8 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <h2 className="text-2xl font-black">Entra na rede Paranoid</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--foreground-muted)]">Guarda eventos, acompanha artistas e recebe sugestões mais próximas dos teus interesses.</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <LinkButton href="/registar">Criar conta</LinkButton>
        <LinkButton href="/login" variant="secondary">Entrar</LinkButton>
      </div>
    </section>
  );
}
