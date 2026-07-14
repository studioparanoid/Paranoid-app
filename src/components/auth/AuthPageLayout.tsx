import type { ReactNode } from "react";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 pb-28 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-3xl space-y-5">{children}</div>
    </main>
  );
}

export function AuthFormCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="content-transition rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:p-9">
      <p className="text-xs font-black uppercase tracking-[0.32em] text-red-600">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-black leading-none sm:text-5xl">
        {title}
      </h1>
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function AuthInfoCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="brand-surface rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] p-5 sm:p-6">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-red-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black text-[var(--brand-foreground)] sm:text-3xl">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-[var(--brand-muted)]">
        {children}
      </div>
    </section>
  );
}

const networkOptions = [
  { title: "Comunidade", description: "Guarda eventos e segue a cena." },
  { title: "Organizador", description: "Publica e gere eventos." },
  { title: "Artista", description: "Cria o teu perfil e liga-te à rede." },
];

export function AuthNetworkOptions() {
  return (
    <AuthInfoCard eyebrow="Rede" title="Entrar na rede">
      <div className="grid gap-2 sm:grid-cols-3">
        {networkOptions.map((option) => (
          <div
            key={option.title}
            className="rounded border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3"
          >
            <p className="font-black text-[var(--brand-foreground)]">{option.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--brand-muted)]">
              {option.description}
            </p>
          </div>
        ))}
      </div>
    </AuthInfoCard>
  );
}
